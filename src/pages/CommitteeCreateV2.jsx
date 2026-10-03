import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Loader2, Plus, X, Users } from "lucide-react";
import { L } from "@/lib/l10n";
import { MEMBER_ROLE } from "@/lib/raqeemUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import EstablishingDocumentSection from "@/components/raqeem/EstablishingDocumentSection";
import SupportingDocumentsSection from "@/components/raqeem/SupportingDocumentsSection";
import CommitteeLogoSection from "@/components/raqeem/CommitteeLogoSection";
import SmartFormAssist from "@/components/raqeem/SmartFormAssist";
import LocalizedDatePicker from "@/components/raqeem/LocalizedDatePicker";

const COMMITTEE_TYPES = [
  { value: "permanent_council", label: "مجلس دائم" },
  { value: "permanent_committee", label: "لجنة دائمة" },
  { value: "temporary_committee", label: "لجنة مؤقتة" },
  { value: "ministerial_committee", label: "لجنة وزارية" },
  { value: "national_committee", label: "لجنة وطنية" },
  { value: "task_force", label: "فريق عمل" },
  { value: "working_group", label: "مجموعة عمل" },
  { value: "advisory_committee", label: "لجنة استشارية" },
  { value: "joint_committee", label: "لجنة مشتركة" },
  { value: "cross_institutional", label: "بين الجهات" },
];

const VOTING_RULES = [
  { value: "simple_majority", label: "أغلبية بسيطة" },
  { value: "two_thirds", label: "ثلثان" },
  { value: "unanimous", label: "إجماع" },
  { value: "chair_decides", label: "الرئيس يقرر" },
];

const CLASSIFICATIONS = [
  { value: "public", label: "عام" },
  { value: "internal", label: "داخلي" },
  { value: "confidential", label: "سري" },
  { value: "restricted", label: "مقيّد" },
];

export default function CommitteeCreateV2() {
  const { orgRef } = useParams();
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    name_ar: "", name_en: "", type: "permanent_committee",
    mandate: "", appointing_authority: "",
    term_start: "", term_end: "", classification: "internal",
    chair_name: "", secretary_name: "",
    quorum_count: 3, voting_rule: "simple_majority", meeting_cadence: "monthly",
    participating_organization_ids: [],
  });
  const [newMember, setNewMember] = useState({ full_name: "", role: "member", institution_name: "" });
  const [newOrgId, setNewOrgId] = useState("");
  const [establishingDoc, setEstablishingDoc] = useState({ type: "", reference: "", date: "", file_url: "", file_name: "" });
  const [supportingDocs, setSupportingDocs] = useState([]);
  const [logoUrl, setLogoUrl] = useState("");

  const publicId = orgRef?.split("--").pop() || orgRef;

  useEffect(() => {
    if (!publicId) return;
    base44.functions.invoke("GetOrganizationPortal", { public_id: publicId }).then((res) => {
      const d = res.data || res;
      if (d.organization) setOrgId(d.organization.id);
    }).catch(() => {});
  }, [publicId]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const applyExtracted = (data) => {
    setForm((f) => ({
      ...f,
      name_ar: data.name_ar || f.name_ar,
      name_en: data.name_en || f.name_en,
      type: data.type || f.type,
      mandate: data.mandate || f.mandate,
      appointing_authority: data.appointing_authority || f.appointing_authority,
      term_start: data.term_start || f.term_start,
      term_end: data.term_end || f.term_end,
      chair_name: data.chair_name || f.chair_name,
      secretary_name: data.secretary_name || f.secretary_name,
      quorum_count: data.quorum_count || f.quorum_count,
      voting_rule: data.voting_rule || f.voting_rule,
      meeting_cadence: data.meeting_cadence || f.meeting_cadence,
      classification: data.classification || f.classification,
    }));
    setEstablishingDoc((d) => ({
      ...d,
      type: data.establishing_doc_type || d.type,
      reference: data.establishing_doc_reference || d.reference,
      date: data.establishing_doc_date || d.date,
    }));
  };

  const addOrgId = () => {
    if (!newOrgId.trim()) return;
    setForm((f) => ({ ...f, participating_organization_ids: [...new Set([...f.participating_organization_ids, newOrgId.trim()])] }));
    setNewOrgId("");
  };

  const addMember = () => {
    if (!newMember.full_name.trim()) return;
    setMembers((m) => [...m, { ...newMember, protocol_order: 99 }]);
    setNewMember({ full_name: "", role: "member", institution_name: "" });
  };

  const submit = async () => {
    if (!form.name_ar.trim() || !form.name_en.trim()) {
      setError("الاسمان العربي والإنجليزي مطلوبان");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("CreateCommittee", {
        ...form,
        organization_id: orgId,
        logo_url: logoUrl || null,
        members,
        establishing_doc: establishingDoc,
        supporting_docs: supportingDocs,
      });
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
      } else {
        navigate(`/o/${orgRef}/c/${data.slug}--${data.public_id}`);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "تعذّر إنشاء اللجنة");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={`/o/${orgRef}`} className="hover:text-foreground">الجهة</Link>
        <span>›</span>
        <span className="text-foreground">إنشاء لجنة</span>
      </div>

      <h1 className="text-xl font-bold">إنشاء لجنة جديدة · Create Committee</h1>

      {error && <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}

      <SmartFormAssist
        fields={[
          { key: "name_ar", label: "اسم اللجنة (عربي)" },
          { key: "name_en", label: "Committee Name (English)" },
          { key: "type", label: "النوع" },
          { key: "mandate", label: "الصلاحية" },
          { key: "appointing_authority", label: "جهة التعيين" },
          { key: "term_start", label: "بداية المدة" },
          { key: "term_end", label: "نهاية المدة" },
          { key: "chair_name", label: "اسم الرئيس" },
          { key: "secretary_name", label: "اسم الأمين" },
        ]}
        context={{ form, establishingDoc, orgId }}
        onApply={(values) => setForm((f) => ({ ...f, ...values }))}
      />

      <div className="raqeem-card p-6 space-y-4">
        <CommitteeLogoSection value={logoUrl} onChange={setLogoUrl} committeeInfo={form} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>اسم اللجنة (عربي) *</Label>
            <Input value={form.name_ar} onChange={(e) => update("name_ar", e.target.value)} placeholder="اللجنة العليا للحوكمة" />
          </div>
          <div className="space-y-1.5">
            <Label>Committee Name (English) *</Label>
            <Input value={form.name_en} onChange={(e) => update("name_en", e.target.value)} placeholder="Higher Committee for Governance" dir="ltr" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>النوع · Type</Label>
            <select value={form.type} onChange={(e) => update("type", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              {COMMITTEE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>التصنيف · Classification</Label>
            <select value={form.classification} onChange={(e) => update("classification", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              {CLASSIFICATIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {(form.type === "joint_committee" || form.type === "cross_institutional") && (
          <div className="space-y-2 p-3 rounded-md bg-accent/5 border border-accent/20">
            <Label>الجهات المشاركة · Participating Organizations</Label>
            <p className="text-xs text-muted-foreground">أضف معرّفات الجهات المشاركة في هذه اللجنة المشتركة · Add the organization IDs of participating institutions</p>
            {form.participating_organization_ids.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.participating_organization_ids.map((oid, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-xs">
                    {oid}
                    <button onClick={() => setForm((f) => ({ ...f, participating_organization_ids: f.participating_organization_ids.filter((_, idx) => idx !== i) }))} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <Input value={newOrgId} onChange={(e) => setNewOrgId(e.target.value)} placeholder="org-id..." className="text-sm" dir="ltr" />
              <Button size="sm" variant="outline" onClick={addOrgId}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>الصلاحية · Mandate</Label>
          <Textarea value={form.mandate} onChange={(e) => update("mandate", e.target.value)} placeholder="نص الصلاحية والنطاق" rows={3} />
        </div>

        <div className="space-y-1.5">
          <Label>الجهة المعيِّنة · Appointing Authority</Label>
          <Input value={form.appointing_authority} onChange={(e) => update("appointing_authority", e.target.value)} placeholder="مجلس الوزراء" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>بداية المدة · Term Start</Label>
            <LocalizedDatePicker value={form.term_start} onChange={(v) => update("term_start", v)} />
          </div>
          <div className="space-y-1.5">
            <Label>نهاية المدة · Term End</Label>
            <LocalizedDatePicker value={form.term_end} onChange={(v) => update("term_end", v)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>الرئيس · Chair</Label>
            <Input value={form.chair_name} onChange={(e) => update("chair_name", e.target.value)} placeholder="السيد/ة ..." />
          </div>
          <div className="space-y-1.5">
            <Label>الأمين · Secretary</Label>
            <Input value={form.secretary_name} onChange={(e) => update("secretary_name", e.target.value)} placeholder="السيد/ة ..." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>النصاب · Quorum</Label>
            <Input type="number" value={form.quorum_count} onChange={(e) => update("quorum_count", parseInt(e.target.value) || 3)} min={1} />
          </div>
          <div className="space-y-1.5">
            <Label>قاعدة التصويت · Voting Rule</Label>
            <select value={form.voting_rule} onChange={(e) => update("voting_rule", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              {VOTING_RULES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>دورية الاجتماعات · Cadence</Label>
            <select value={form.meeting_cadence} onChange={(e) => update("meeting_cadence", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="weekly">أسبوعي</option>
              <option value="biweekly">كل أسبوعين</option>
              <option value="monthly">شهري</option>
              <option value="quarterly">فصلي</option>
              <option value="ad_hoc">حسب الحاجة</option>
            </select>
          </div>
        </div>

        {/* Additional members */}
        <div className="space-y-2 pt-2 border-t border-border">
          <Label>أعضاء إضافيون · Additional Members</Label>
          {members.length > 0 && (
            <div className="space-y-1.5">
              {members.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-secondary/30 text-sm">
                  <span>{L.name(m, "full_name")} · {L.label(MEMBER_ROLE, m.role)} {m.institution_name ? `· ${m.institution_name}` : ""}</span>
                  <button onClick={() => setMembers((arr) => arr.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input value={newMember.full_name} onChange={(e) => setNewMember((m) => ({ ...m, full_name: e.target.value }))} placeholder="اسم العضو" className="text-sm" />
            </div>
            <select value={newMember.role} onChange={(e) => setNewMember((m) => ({ ...m, role: e.target.value }))} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
              <option value="member">عضو</option>
              <option value="vice_chair">نائب رئيس</option>
              <option value="alternate">بديل</option>
              <option value="observer">مراقب</option>
              <option value="advisor">مستشار</option>
            </select>
            <Button size="sm" variant="outline" onClick={addMember}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Establishing document */}
        <div className="space-y-3 pt-4 border-t border-border">
          <EstablishingDocumentSection
            value={establishingDoc}
            onChange={setEstablishingDoc}
            onExtracted={applyExtracted}
          />
        </div>

        {/* Supporting documents */}
        <div className="space-y-3 pt-4 border-t border-border">
          <SupportingDocumentsSection value={supportingDocs} onChange={setSupportingDocs} />
        </div>

        <div className="p-3 rounded-md bg-secondary/40 text-xs text-muted-foreground">
          ستُنشأ اللجنة بحالة "مسودة" حتى تستوفي متطلبات التفعيل (الصلاحية، الرئيس، الأمين، النصاب، قاعدة التصويت، التواريخ).
        </div>

        <Button onClick={submit} disabled={submitting || !orgId} className="w-full h-10 inline-flex items-center justify-center gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 rotate-180" />}
          {submitting ? "جارٍ الإنشاء..." : "إنشاء اللجنة"}
        </Button>
      </div>
    </div>
  );
}