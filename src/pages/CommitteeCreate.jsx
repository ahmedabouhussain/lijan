import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Check, ChevronLeft, ChevronRight, X, Sparkles, Wand2 } from "lucide-react";
import { COMMITTEE_TYPES } from "@/lib/raqeemUtils";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "identity", label: "الهوية", labelEn: "Identity" },
  { key: "mandate", label: "الصلاحية", labelEn: "Mandate" },
  { key: "authority", label: "الجهة المؤسِّسة", labelEn: "Authority" },
  { key: "scope", label: "النطاق", labelEn: "Scope" },
  { key: "term", label: "المدة", labelEn: "Term" },
  { key: "leadership", label: "الرئاسة والأمانة", labelEn: "Leadership" },
  { key: "quorum", label: "النصاب والتصويت", labelEn: "Quorum & Voting" },
  { key: "cadence", label: "الدورية والتصنيف", labelEn: "Cadence" },
  { key: "review", label: "المراجعة", labelEn: "Review" },
];

export default function CommitteeCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [suggestedMembers, setSuggestedMembers] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [form, setForm] = useState({
    name_ar: "",
    name_en: "",
    type: "permanent_committee",
    mandate: "",
    establishing_authority: "",
    scope: "",
    term_start: "",
    term_end: "",
    chair_name: "",
    secretary_name: "",
    quorum_count: 3,
    voting_rule: "simple_majority",
    meeting_cadence: "monthly",
    classification: "internal",
    reporting_requirements: "",
  });

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  // Fetch user's institution context
  useEffect(() => {
    async function loadInstitution() {
      try {
        const user = await base44.auth.me();
        if (user?.institution_id) {
          const inst = await base44.entities.Institution.get(user.institution_id).catch(() => null);
          if (inst) setInstitution(inst);
        } else {
          // Check pending entity from EntryPortal
          const pending = localStorage.getItem("raqeem_pending_entity");
          if (pending) {
            const entity = JSON.parse(pending);
            // Find or create institution
            const existing = await base44.entities.Institution.filter({ name_en: entity.en }).catch(() => []);
            let inst = existing && existing[0];
            if (!inst) {
              inst = await base44.entities.Institution.create({
                name_ar: entity.ar,
                name_en: entity.en,
                type: entity.category === "holding" ? "organization" : entity.category === "ministry" ? "ministry" : "authority",
                status: "active",
              });
            }
            await base44.auth.updateMe({ institution_id: inst.id });
            setInstitution(inst);
            localStorage.removeItem("raqeem_pending_entity");
          }
        }
      } catch {
        // Non-critical — committee creation falls back to default
      }
    }
    loadInstitution();
  }, []);

  // AI: Auto-generate full governance structure
  const autoGenerate = async () => {
    if (!form.name_ar && !form.name_en) {
      setAiError("أدخل اسم اللجنة أولاً · Enter committee name first");
      return;
    }
    setGenerating(true);
    setAiError(null);
    try {
      const response = await base44.functions.invoke("GenerateCommitteeGovernance", {
        committee_name_ar: form.name_ar || form.name_en,
        committee_name_en: form.name_en || form.name_ar,
        type: form.type,
        institution_name_ar: institution?.name_ar,
        institution_name_en: institution?.name_en,
      });
      const data = response.data;
      // Extract chair and secretary from suggested members
      const chair = data.suggested_members?.find((m) => m.role === "chair");
      const secretary = data.suggested_members?.find((m) => m.role === "secretary");
      // Default term: today → +3 years
      const today = new Date();
      const termEnd = new Date();
      termEnd.setFullYear(termEnd.getFullYear() + 3);
      setForm((p) => ({
        ...p,
        mandate: data.mandate_ar || p.mandate,
        scope: data.scope_ar || p.scope,
        establishing_authority: data.establishing_authority_ar || p.establishing_authority,
        chair_name: chair?.full_name_ar || chair?.full_name || p.chair_name,
        secretary_name: secretary?.full_name_ar || secretary?.full_name || p.secretary_name,
        quorum_count: data.quorum_count || p.quorum_count,
        voting_rule: data.voting_rule || p.voting_rule,
        meeting_cadence: data.meeting_cadence || p.meeting_cadence,
        classification: data.classification || p.classification,
        reporting_requirements: data.reporting_requirements_ar || p.reporting_requirements,
        term_start: p.term_start || today.toISOString().split("T")[0],
        term_end: p.term_end || termEnd.toISOString().split("T")[0],
      }));
      if (data.suggested_members) setSuggestedMembers(data.suggested_members);
      // Jump to review step
      setStep(STEPS.length - 1);
    } catch {
      setAiError("تعذر التوليد الآن · Could not generate at this time");
    }
    setGenerating(false);
  };

  // AI: Suggest a single field
  const suggestField = async (field) => {
    setGenerating(true);
    setAiError(null);
    try {
      const response = await base44.functions.invoke("GenerateCommitteeGovernance", {
        committee_name_ar: form.name_ar || form.name_en,
        committee_name_en: form.name_en || form.name_ar,
        type: form.type,
        institution_name_ar: institution?.name_ar,
        institution_name_en: institution?.name_en,
      });
      const data = response.data;
      const fieldMap = {
        mandate: data.mandate_ar,
        scope: data.scope_ar,
        establishing_authority: data.establishing_authority_ar,
        reporting_requirements: data.reporting_requirements_ar,
      };
      if (fieldMap[field]) update(field, fieldMap[field]);
      if (data.suggested_members) setSuggestedMembers(data.suggested_members);
    } catch {
      setAiError("تعذر الاقتراح الآن · Could not suggest at this time");
    }
    setGenerating(false);
  };

  const canProceed = () => {
    if (step === 0) return form.name_ar && form.name_en;
    if (step === 1) return form.mandate;
    if (step === 2) return form.establishing_authority;
    if (step === 3) return form.scope;
    if (step === 4) return form.term_start && form.term_end;
    if (step === 5) return form.chair_name && form.secretary_name;
    if (step === 6) return form.quorum_count > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      // Default institution — in production this would be the user's institution
      const record = await base44.entities.Committee.create({
        ...form,
        institution_id: institution?.id || "default",
        status: "draft",
        governance_complete: false,
      });
      navigate(`/committees/${record.id}`);
    } catch (e) {
      setError("تعذر حفظ اللجنة حاليًا. حاول مرة أخرى.");
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/committees")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ChevronRight className="w-4 h-4" /> العودة للجان
          </button>
          <h1 className="text-2xl font-bold text-foreground">إنشاء لجنة · Create Committee</h1>
          <p className="text-sm text-muted-foreground mt-1">معالج الحوكمة · Governance Wizard</p>
        </div>
        <button onClick={() => navigate("/committees")} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Step progress */}
      <div className="raqeem-card p-4">
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={cn(
                  "flex flex-col items-center gap-1 shrink-0 px-2",
                  i < step && "cursor-pointer",
                  i > step && "opacity-40 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors",
                    i < step ? "bg-primary border-primary text-primary-foreground" :
                    i === step ? "border-primary text-primary bg-card" :
                    "border-border text-muted-foreground bg-card"
                  )}
                >
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={cn("text-[10px] whitespace-nowrap", i === step ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1 min-w-4 mt-3.5 rounded", i < step ? "bg-primary" : "bg-border")} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="raqeem-card p-6">
        {/* Step 0: Identity */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">هوية اللجنة · Committee Identity</h2>
            <div>
              <label className={labelClass}>اسم اللجنة بالعربية *</label>
              <input className={inputClass} value={form.name_ar} onChange={(e) => update("name_ar", e.target.value)} placeholder="مثال: اللجنة الوطنية للحوكمة الرقمية" />
            </div>
            <div>
              <label className={labelClass}>Committee Name (English) *</label>
              <input className={inputClass} value={form.name_en} onChange={(e) => update("name_en", e.target.value)} placeholder="e.g. National Digital Governance Committee" dir="ltr" />
            </div>
            <div>
              <label className={labelClass}>نوع اللجنة · Type</label>
              <select className={inputClass} value={form.type} onChange={(e) => update("type", e.target.value)}>
                {Object.entries(COMMITTEE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.ar} — {v.en}</option>
                ))}
              </select>
            </div>

            {/* AI Auto-Generate */}
            <div className="mt-2 border border-accent/30 bg-accent/5 rounded-md p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">توليد الحوكمة بالذكاء الاصطناعي · AI Auto-Generate</div>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    يولّد AI موثوق الصلاحية والنطاق والجهة المؤسِّسة والنصاب وقواعد التصويت والأعضاء المقترحين — بضغطة واحدة، مع إمكانية التعديل.
                  </p>
                  <button
                    onClick={autoGenerate}
                    disabled={generating}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                  >
                    {generating ? (
                      <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> جارٍ التوليد...</>
                    ) : (
                      <><Wand2 className="w-4 h-4" /> توليد تلقائي · Auto-Generate</>
                    )}
                  </button>
                  {aiError && <p className="text-xs text-destructive mt-2">{aiError}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Mandate */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">الصلاحية · Mandate</h2>
            <p className="text-sm text-muted-foreground">لماذا أُنشئت هذه اللجنة؟ ما السلطة المفوضة لها؟</p>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass + " mb-0"}>نص الصلاحية *</label>
                <button onClick={() => suggestField("mandate")} disabled={generating} className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 disabled:opacity-50">
                  <Wand2 className="w-3 h-3" /> اقتراح AI
                </button>
              </div>
              <textarea className={inputClass} rows={5} value={form.mandate} onChange={(e) => update("mandate", e.target.value)} placeholder="تتولى اللجنة صلاحية..." />
            </div>
          </div>
        )}

        {/* Step 2: Authority */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">الجهة المؤسِّسة · Establishing Authority</h2>
            <p className="text-sm text-muted-foreground">ما الجهة التي أنشأت أو فوّضت هذه اللجنة؟</p>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass + " mb-0"}>الجهة المؤسِّسة *</label>
                <button onClick={() => suggestField("establishing_authority")} disabled={generating} className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 disabled:opacity-50">
                  <Wand2 className="w-3 h-3" /> اقتراح AI
                </button>
              </div>
              <input className={inputClass} value={form.establishing_authority} onChange={(e) => update("establishing_authority", e.target.value)} placeholder="مثال: مجلس الوزراء / المرسوم رقم ..." />
            </div>
          </div>
        )}

        {/* Step 3: Scope */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">النطاق والمسؤوليات · Scope & Responsibilities</h2>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass + " mb-0"}>نطاق العمل والمسؤوليات *</label>
                <button onClick={() => suggestField("scope")} disabled={generating} className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 disabled:opacity-50">
                  <Wand2 className="w-3 h-3" /> اقتراح AI
                </button>
              </div>
              <textarea className={inputClass} rows={5} value={form.scope} onChange={(e) => update("scope", e.target.value)} placeholder="حدد نطاق صلاحيات اللجنة ومسؤولياتها..." />
            </div>
          </div>
        )}

        {/* Step 4: Term */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">مدة اللجنة · Term</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>تاريخ البدء *</label>
                <input type="date" className={inputClass} value={form.term_start} onChange={(e) => update("term_start", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>تاريخ الانتهاء *</label>
                <input type="date" className={inputClass} value={form.term_end} onChange={(e) => update("term_end", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Leadership */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">الرئاسة والأمانة · Chair & Secretariat</h2>
            <div>
              <label className={labelClass}>اسم الرئيس *</label>
              <input className={inputClass} value={form.chair_name} onChange={(e) => update("chair_name", e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div>
              <label className={labelClass}>اسم الأمين *</label>
              <input className={inputClass} value={form.secretary_name} onChange={(e) => update("secretary_name", e.target.value)} placeholder="الاسم الكامل" />
            </div>
          </div>
        )}

        {/* Step 6: Quorum & Voting */}
        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">النصاب والتصويت · Quorum & Voting</h2>
            <div>
              <label className={labelClass}>النصاب القانوني (عدد الأعضاء) *</label>
              <input type="number" min="1" className={inputClass} value={form.quorum_count} onChange={(e) => update("quorum_count", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>قاعدة التصويت · Voting Rule</label>
              <select className={inputClass} value={form.voting_rule} onChange={(e) => update("voting_rule", e.target.value)}>
                <option value="simple_majority">الأغلبية البسيطة · Simple Majority</option>
                <option value="two_thirds">الثلثان · Two-Thirds</option>
                <option value="unanimous">الإجماع · Unanimous</option>
                <option value="chair_decides">قرار الرئيس · Chair Decides</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 7: Cadence & Classification */}
        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">الدورية والتصنيف · Cadence & Classification</h2>
            <div>
              <label className={labelClass}>دورية الاجتماعات</label>
              <select className={inputClass} value={form.meeting_cadence} onChange={(e) => update("meeting_cadence", e.target.value)}>
                <option value="weekly">أسبوعي</option>
                <option value="biweekly">كل أسبوعين</option>
                <option value="monthly">شهري</option>
                <option value="quarterly">ربع سنوي</option>
                <option value="ad_hoc">حسب الحاجة</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>مستوى التصنيف</label>
              <select className={inputClass} value={form.classification} onChange={(e) => update("classification", e.target.value)}>
                <option value="public">عام</option>
                <option value="internal">داخلي</option>
                <option value="confidential">سري</option>
                <option value="restricted">مقيد</option>
                <option value="highly_restricted">سري للغاية</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>متطلبات التقارير · Reporting Requirements</label>
              <textarea className={inputClass} rows={3} value={form.reporting_requirements} onChange={(e) => update("reporting_requirements", e.target.value)} placeholder="مثال: تقرير ربع سنوي للجهة المؤسِّسة" />
            </div>
          </div>
        )}

        {/* Step 8: Review */}
        {step === 8 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">مراجعة وتفعيل · Review & Activate</h2>
            <p className="text-sm text-muted-foreground">راجع تفاصيل اللجنة قبل الحفظ. ستنشأ اللجنة كمسودة حتى استكمال متطلبات الحوكمة.</p>
            <div className="bg-secondary/40 rounded-md p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">الاسم:</span><span className="font-medium">{form.name_ar}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">النوع:</span><span className="font-medium">{COMMITTEE_TYPES[form.type]?.ar}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الرئيس:</span><span className="font-medium">{form.chair_name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الأمين:</span><span className="font-medium">{form.secretary_name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">النصاب:</span><span className="font-medium">{form.quorum_count}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الدورية:</span><span className="font-medium">{form.meeting_cadence}</span></div>
            </div>

            {/* AI Suggested Members */}
            {suggestedMembers.length > 0 && (
              <div className="border border-accent/30 bg-accent/5 rounded-md p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-sm font-semibold">أعضاء مقترحون من AI · AI Suggested Members</span>
                </div>
                <div className="space-y-1.5">
                  {suggestedMembers.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{m.full_name_ar || m.full_name}</span>
                      <span className="text-muted-foreground">{m.role} · {m.authority_level}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">ستتمكن من إضافة الأعضاء بعد إنشاء اللجنة · You can add members after creating the committee</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground disabled:opacity-40 hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" /> السابق
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            التالي <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-40"
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> جارٍ الحفظ...</>
            ) : (
              <><Check className="w-4 h-4" /> حفظ اللجنة</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}