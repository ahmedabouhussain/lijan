import React, { useState, useEffect } from "react";
import { L } from "@/lib/l10n";
import { useCommittee } from "@/lib/CommitteeContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { base44 } from "@/api/base44Client";
import { ScrollText, Loader2, Upload, Sparkles, FileText, AlertTriangle, Check, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/raqeem/StatusBadge";
import LocalizedFileUpload from "@/components/raqeem/LocalizedFileUpload";
import LocalizedDatePicker from "@/components/raqeem/LocalizedDatePicker";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";

const INSTRUMENT_TYPES = [
  { value: "law", label: "قانون / لائحة" },
  { value: "amiri_decree", label: "مرسوم أميري" },
  { value: "amiri_decision", label: "قرار أميري" },
  { value: "council_of_ministers_decision", label: "قرار مجلس الوزراء" },
  { value: "ministerial_decision", label: "قرار وزاري" },
  { value: "administrative_decision", label: "قرار إداري" },
  { value: "board_resolution", label: "قرار مجلس" },
  { value: "executive_decision", label: "قرار تنفيذي" },
  { value: "circular", label: "تعميم" },
  { value: "directive", label: "توجيه" },
  { value: "official_memorandum", label: "مذكرة رسمية" },
  { value: "official_letter", label: "خطاب رسمي" },
  { value: "charter", label: "ميثاق" },
  { value: "terms_of_reference", label: "اختصاصات" },
  { value: "policy_instrument", label: "أداة سياسة" },
  { value: "inter_entity_agreement", label: "اتفاقية بين جهات" },
  { value: "internal_governance_instrument", label: "أداة حوكمة داخلية" },
  { value: "other", label: "أخرى" },
];

const STATUS_COLORS = {
  draft: "bg-secondary text-secondary-foreground",
  verified: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  superseded: "bg-amber-100 text-amber-700",
  repealed: "bg-destructive/15 text-destructive",
  archived: "bg-secondary text-muted-foreground",
};

export default function CommitteeEstablishment() {
  const { data, reload } = useCommittee();
  const { getTitle } = usePageConfig("establishment");
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState("");
  const [extraction, setExtraction] = useState(null);
  const [confirming, setConfirming] = useState("");
  const [creatingDraft, setCreatingDraft] = useState("");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    instrument_type: "ministerial_decision",
    custom_type: "", custom_description: "", issuing_authority_custom: "",
    title_ar: "", title_en: "", instrument_number: "",
    issuing_authority: "", issuer_name: "", issuer_capacity: "",
    issue_date: "", effective_date: "", expiry_date: "",
    jurisdiction: "", official_reference: "",
    language: "ar", classification: "internal",
    file_url: "", original_filename: "", mime_type: "", file_size: 0,
  });

  const loadInstruments = async () => {
    if (!data?.committee) return;
    setLoading(true);
    try {
      const res = await base44.entities.FoundingInstrument.filter({
        committee_id: data.committee.id,
      }, "-created_date", 50);
      setInstruments(res || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadInstruments(); }, [data?.committee?.id]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({
        ...f,
        file_url,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
      }));
    } catch (err) {
      setMsg("تعذّر رفع الملف");
    }
    setUploading(false);
  };

  const submit = async () => {
    if (!form.title_ar || !form.file_url) { setMsg(L.pair("العنوان العربي والملف مطلوبان", "The Arabic title and the file are required")); return; }
    setUploading(true);
    try {
      const res = await base44.functions.invoke("UploadFoundingInstrument", {
        committee_id: data.committee.id, ...form,
      });
      const d = res.data || res;
      if (d.error) { setMsg(d.error); }
      else {
        setMsg("تم تسجيل السند التأسيسي");
        setShowForm(false);
        setForm({ instrument_type: "ministerial_decision", custom_type: "", title_ar: "", title_en: "", file_url: "" });
        loadInstruments();
      }
    } catch (e) { setMsg(e?.message || "خطأ"); }
    setUploading(false);
  };

  const runExtraction = async (instrumentId) => {
    setExtracting(instrumentId);
    setExtraction(null);
    try {
      const res = await base44.functions.invoke("ExtractInstrumentData", { instrument_id: instrumentId });
      const d = res.data || res;
      if (d.error) { setMsg(d.error); }
      else { setExtraction({ instrumentId, data: d.extracted, warning: d.warning }); loadInstruments(); }
    } catch (e) { setMsg(e?.message || "خطأ في الاستخراج"); }
    setExtracting("");
  };

  const confirmExtraction = async (instrumentId) => {
    setConfirming(instrumentId);
    try {
      const res = await base44.functions.invoke("ConfirmExtractedInstrumentFields", { instrument_id: instrumentId });
      const d = res.data || res;
      if (d.error) setMsg(d.error);
      else { setMsg("تم تأكيد البيانات المستخرجة — جاهزة لإنشاء مسودة اللجنة"); loadInstruments(); }
    } catch (e) { setMsg(e?.message || "خطأ"); }
    setConfirming("");
  };

  const createDraftFromInstrument = async (instrumentId) => {
    setCreatingDraft(instrumentId);
    try {
      const res = await base44.functions.invoke("CreateCommitteeDraftFromInstrument", { instrument_id: instrumentId });
      const d = res.data || res;
      if (d.error) setMsg(d.error);
      else { setMsg(`تم إنشاء مسودة اللجنة — ${d.members_created} أعضاء، نسخة تشكيل #${d.formation_version}`); loadInstruments(); }
    } catch (e) { setMsg(e?.message || "خطأ"); }
    setCreatingDraft("");
  };

  if (!data) return <TableSkeleton rows={4} />;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("التأسيس والسندات", "Establishment & Instruments")}</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Upload className="w-4 h-4" /> تسجيل سند
        </Button>
      </div>

      {msg && <div className="p-3 rounded-md bg-secondary text-sm">{msg}</div>}

      {showForm && (
        <div className="raqeem-card p-4 space-y-3">
          <Label className="text-sm font-semibold">تسجيل سند تأسيس رسمي</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">نوع السند</Label>
              <select
                value={form.instrument_type}
                onChange={(e) => setForm((f) => ({ ...f, instrument_type: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {INSTRUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">العنوان العربي *</Label>
              <Input value={form.title_ar} onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">العنوان الإنجليزي</Label>
              <Input dir="ltr" value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">رقم السند</Label>
              <Input value={form.instrument_number} onChange={(e) => setForm((f) => ({ ...f, instrument_number: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">جهة الإصدار</Label>
              <Input value={form.issuing_authority} onChange={(e) => setForm((f) => ({ ...f, issuing_authority: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">تاريخ الإصدار</Label>
              <LocalizedDatePicker value={form.issue_date} onChange={(v) => setForm((f) => ({ ...f, issue_date: v }))} />
            </div>
            <div>
              <Label className="text-xs">تاريخ النفاذ</Label>
              <LocalizedDatePicker value={form.effective_date} onChange={(v) => setForm((f) => ({ ...f, effective_date: v }))} />
            </div>
            <div>
              <Label className="text-xs">المرجع الرسمي</Label>
              <Input value={form.official_reference} onChange={(e) => setForm((f) => ({ ...f, official_reference: e.target.value }))} />
            </div>
          </div>
          {form.instrument_type === "other" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="النوع المخصص" value={form.custom_type} onChange={(e) => setForm((f) => ({ ...f, custom_type: e.target.value }))} />
              <Input placeholder="جهة الإصدار (مخصص)" value={form.issuing_authority_custom} onChange={(e) => setForm((f) => ({ ...f, issuing_authority_custom: e.target.value }))} />
            </div>
          )}
          <div>
            <Label className="text-xs">الملف الرسمي (PDF / صورة / Word)</Label>
            <LocalizedFileUpload
              value={{ file_url: form.file_url, file_name: form.original_filename, file_size: form.file_size }}
              onUpload={async (file) => {
                setUploading(true);
                try {
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  setForm((f) => ({ ...f, file_url, original_filename: file.name, mime_type: file.type, file_size: file.size }));
                } catch { setMsg("تعذّر رفع الملف"); }
                setUploading(false);
              }}
            />
          </div>
          <Button size="sm" disabled={uploading || !form.file_url} onClick={submit} className="inline-flex items-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            حفظ السند
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : instruments.length === 0 ? (
        <div className="raqeem-card p-6 text-center text-sm text-muted-foreground">
          لا توجد سندات تأسيس مسجَّلة. ابدأ بتسجيل السند الرسمي للجنة.
        </div>
      ) : (
        <div className="space-y-2">
          {instruments.map((inst) => (
            <div key={inst.id} className="raqeem-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{inst.title_ar}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {INSTRUMENT_TYPES.find((t) => t.value === inst.instrument_type)?.label || inst.instrument_type}
                    {inst.instrument_number ? ` · ${inst.instrument_number}` : ""}
                    {inst.issuing_authority ? ` · ${inst.issuing_authority}` : ""}
                    {inst.issue_date ? ` · ${inst.issue_date}` : ""}
                  </div>
                </div>
                <StatusBadge label={inst.document_status} colorClass={STATUS_COLORS[inst.document_status] || "bg-secondary"} />
              </div>
              {inst.file_url && (
                <div className="flex items-center gap-2">
                  <a href={inst.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                    <FileText className="w-3.5 h-3.5" /> {inst.original_filename || "الملف"}
                  </a>
                  {inst.signature_detected && (
                    <span className="text-xs text-amber-600 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> توقيع مرصود — غير موثَّق
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm" variant="outline"
                  disabled={extracting === inst.id}
                  onClick={() => runExtraction(inst.id)}
                  className="inline-flex items-center gap-2"
                >
                  {extracting === inst.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  استخراج بالذكاء الاصطناعي
                </Button>
                {inst.extraction_status === "extracted" && (
                  <span className="text-xs text-green-600">تم الاستخراج — بانتظار المراجعة</span>
                )}
              </div>
              {extraction?.instrumentId === inst.id && extraction.data && (
                <div className="mt-2 p-3 rounded-md bg-secondary/40 space-y-2 text-xs">
                  {extraction.warning && <div className="text-amber-600">{extraction.warning}</div>}
                  <ExtractionView data={extraction.data} />
                </div>
              )}
              {inst.extracted_data && !extraction && inst.extraction_status === "extracted" && (
                <div className="mt-2 p-3 rounded-md bg-secondary/40 text-xs">
                  <ExtractionView data={JSON.parse(inst.extracted_data)} />
                </div>
              )}
              {inst.extraction_status === "extracted" && (
                <Button
                  size="sm" variant="outline"
                  disabled={confirming === inst.id}
                  onClick={() => confirmExtraction(inst.id)}
                  className="inline-flex items-center gap-2 h-7 text-xs"
                >
                  {confirming === inst.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  تأكيد البيانات المستخرجة
                </Button>
              )}
              {inst.extraction_status === "confirmed" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> تم التأكيد
                  </span>
                  <Button
                    size="sm" variant="default"
                    disabled={creatingDraft === inst.id}
                    onClick={() => createDraftFromInstrument(inst.id)}
                    className="inline-flex items-center gap-2 h-7 text-xs"
                  >
                    {creatingDraft === inst.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus2 className="w-3.5 h-3.5" />}
                    إنشاء مسودة لجنة من السند
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExtractionView({ data }) {
  const FIELD_LABELS = {
    // Instrument fields
    instrument_type: "نوع السند", instrument_number: "رقم السند", issuing_authority: "جهة الإصدار",
    issuer_name: "اسم المُصدِر", issuer_capacity: "صفة المُصدِر", issue_date: "تاريخ الإصدار",
    effective_date: "تاريخ النفاذ", expiry_date: "تاريخ الانتهاء", official_reference: "المرجع الرسمي",
    jurisdiction: "الاختصاص", title_ar: "العنوان (عربي)", title_en: "العنوان (إنجليزي)",
    // Committee fields
    name_ar: "الاسم (عربي)", name_en: "الاسم (إنجليزي)", type: "النوع", mandate: "الصلاحية",
    appointing_authority: "جهة التعيين", term_start: "بداية المدة", term_end: "نهاية المدة",
    classification: "التصنيف", quorum_count: "النصاب", voting_rule: "قاعدة التصويت",
    meeting_cadence: "إيقاع الاجتماعات", chair_name: "اسم الرئيس", secretary_name: "اسم الأمين",
    // Formation fields
    members: "الأعضاء", full_name: "الاسم الكامل", role: "الدور", institution_name: "الجهة الممثلة",
    // Governance fields
    governance_rules: "قواعد الحوكمة", reporting_requirements: "متطلبات التقارير",
  };
  const CONF_LABELS = { high: "عالية", medium: "متوسطة", low: "منخفضة" };

  const sections = [
    { title: "بيانات السند", fields: data.instrument },
    { title: "بيانات اللجنة", fields: data.committee },
    { title: "التشكيل", fields: data.formation },
    { title: "الحوكمة", fields: data.governance },
  ];
  return (
    <div className="space-y-2">
      {sections.map((sec) => {
        if (!sec.fields) return null;
        const entries = Object.entries(sec.fields).filter(([, v]) => v && (!v.confidence || v.confidence !== "not_found"));
        if (entries.length === 0) return null;
        return (
          <div key={sec.title}>
            <div className="font-semibold text-foreground">{sec.title}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-1">
              {entries.map(([k, v]) => {
                const val = typeof v === "object" ? v.value : v;
                const conf = typeof v === "object" ? v.confidence : null;
                if (!val) return null;
                return (
                  <div key={k} className="flex items-center gap-1">
                    <span className="text-muted-foreground">{FIELD_LABELS[k] || k}:</span>
                    <span className="truncate">{String(val).slice(0, 80)}</span>
                    {conf && (
                      <span className={
                        conf === "high" ? "text-green-600" :
                        conf === "medium" ? "text-amber-600" : "text-destructive"
                      }>· {CONF_LABELS[conf] || conf}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}