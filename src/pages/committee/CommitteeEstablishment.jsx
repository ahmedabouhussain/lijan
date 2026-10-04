import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommittee } from "@/lib/CommitteeContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { base44 } from "@/api/base44Client";
import { ScrollText, Loader2, Upload, Sparkles, AlertTriangle, Check, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/raqeem/StatusBadge";
import LocalizedFileUpload from "@/components/raqeem/LocalizedFileUpload";
import LocalizedDatePicker from "@/components/raqeem/LocalizedDatePicker";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import SecureFileLink from "@/components/raqeem/SecureFileLink";
import { uploadPrivateFile, logFileAccess } from "@/lib/secureFiles";

const MAX_OFFICIAL_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_OFFICIAL_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const INSTRUMENT_TYPES = [
  { value: "law", ar: "قانون / لائحة", en: "Law / Regulation" },
  { value: "amiri_decree", ar: "مرسوم أميري", en: "Amiri Decree" },
  { value: "amiri_decision", ar: "قرار أميري", en: "Amiri Decision" },
  { value: "council_of_ministers_decision", ar: "قرار مجلس الوزراء", en: "Council of Ministers Decision" },
  { value: "ministerial_decision", ar: "قرار وزاري", en: "Ministerial Decision" },
  { value: "administrative_decision", ar: "قرار إداري", en: "Administrative Decision" },
  { value: "board_resolution", ar: "قرار مجلس", en: "Board Resolution" },
  { value: "executive_decision", ar: "قرار تنفيذي", en: "Executive Decision" },
  { value: "circular", ar: "تعميم", en: "Circular" },
  { value: "directive", ar: "توجيه", en: "Directive" },
  { value: "official_memorandum", ar: "مذكرة رسمية", en: "Official Memorandum" },
  { value: "official_letter", ar: "خطاب رسمي", en: "Official Letter" },
  { value: "charter", ar: "ميثاق", en: "Charter" },
  { value: "terms_of_reference", ar: "اختصاصات", en: "Terms of Reference" },
  { value: "policy_instrument", ar: "أداة سياسة", en: "Policy Instrument" },
  { value: "inter_entity_agreement", ar: "اتفاقية بين جهات", en: "Inter-Entity Agreement" },
  { value: "internal_governance_instrument", ar: "أداة حوكمة داخلية", en: "Internal Governance Instrument" },
  { value: "other", ar: "أخرى", en: "Other" },
];

const STATUS_COLORS = {
  draft: "bg-secondary text-secondary-foreground",
  verified: "bg-state-info-surface text-state-info-ink",
  approved: "bg-green-100 text-green-700",
  superseded: "bg-amber-100 text-amber-700",
  repealed: "bg-destructive/15 text-destructive",
  archived: "bg-secondary text-muted-foreground",
};

const STATUS_LABELS = {
  draft: ["مسودة", "Draft"],
  verified: ["موثَّق", "Verified"],
  approved: ["معتمد", "Approved"],
  superseded: ["مُستبدَل", "Superseded"],
  repealed: ["ملغى", "Repealed"],
  archived: ["مؤرشف", "Archived"],
};

export default function CommitteeEstablishment() {
  const { t } = useLanguage();
  const { data } = useCommittee();
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

  const typeLabel = (v) => {
    const found = INSTRUMENT_TYPES.find((x) => x.value === v);
    return found ? t(found.ar, found.en) : v;
  };
  const statusLabel = (s) => {
    const pair = STATUS_LABELS[s];
    return pair ? t(pair[0], pair[1]) : s;
  };

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
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadInstruments(); }, [data?.committee?.id]);

  // The single upload path for the committee's official founding file. The file goes to
  // private storage and the record keeps only its private reference; the readable link is
  // minted on demand, for one view at a time.
  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_OFFICIAL_FILE_BYTES) {
      setMsg(t("حجم الملف يتجاوز ٢٥ ميجابايت", "The file is larger than 25 MB"));
      return;
    }
    if (file.type && !ALLOWED_OFFICIAL_FILE_TYPES.includes(file.type)) {
      setMsg(t("نوع الملف غير مدعوم", "This file type is not supported"));
      return;
    }
    setUploading(true);
    try {
      const file_url = await uploadPrivateFile(file);
      await logFileAccess({
        action: "upload",
        fileRef: file_url,
        entityType: "FoundingInstrument",
        entityId: data?.committee?.id,
        committeeId: data?.committee?.id,
        title: file.name,
      });
      setForm((f) => ({
        ...f,
        file_url,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
      }));
      setMsg("");
    } catch (error) {
      setMsg(error?.message || t("تعذّر رفع الملف", "The file could not be uploaded"));
    }
    setUploading(false);
  };

  const submit = async () => {
    if (!form.title_ar || !form.file_url) {
      setMsg(t("العنوان العربي والملف مطلوبان", "The Arabic title and the file are required"));
      return;
    }
    setUploading(true);
    try {
      const res = await base44.functions.invoke("UploadFoundingInstrument", {
        committee_id: data.committee.id, ...form,
      });
      const d = res.data || res;
      if (d.error) { setMsg(d.error); }
      else {
        setMsg(t("تم تسجيل السند التأسيسي", "The founding instrument was recorded"));
        setShowForm(false);
        setForm({ instrument_type: "ministerial_decision", custom_type: "", title_ar: "", title_en: "", file_url: "" });
        loadInstruments();
      }
    } catch (e) { setMsg(e?.message || t("خطأ", "Error")); }
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
    } catch (e) { setMsg(e?.message || t("خطأ في الاستخراج", "Extraction failed")); }
    setExtracting("");
  };

  const confirmExtraction = async (instrumentId) => {
    setConfirming(instrumentId);
    try {
      const res = await base44.functions.invoke("ConfirmExtractedInstrumentFields", { instrument_id: instrumentId });
      const d = res.data || res;
      if (d.error) setMsg(d.error);
      else {
        setMsg(t("تم تأكيد البيانات المستخرجة — جاهزة لإنشاء مسودة اللجنة", "The extracted data was confirmed — ready to create the committee draft"));
        loadInstruments();
      }
    } catch (e) { setMsg(e?.message || t("خطأ", "Error")); }
    setConfirming("");
  };

  const createDraftFromInstrument = async (instrumentId) => {
    setCreatingDraft(instrumentId);
    try {
      const res = await base44.functions.invoke("CreateCommitteeDraftFromInstrument", { instrument_id: instrumentId });
      const d = res.data || res;
      if (d.error) setMsg(d.error);
      else {
        setMsg(`${t("تم إنشاء مسودة اللجنة", "Committee draft created")} — ${d.members_created} ${t("أعضاء", "members")}، ${t("نسخة تشكيل", "formation version")} #${d.formation_version}`);
        loadInstruments();
      }
    } catch (e) { setMsg(e?.message || t("خطأ", "Error")); }
    setCreatingDraft("");
  };

  if (!data) return <TableSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ScrollText}
        title={getTitle("التأسيس والسندات", "Establishment & Instruments")}
        actions={
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Upload className="w-4 h-4" aria-hidden="true" /> {t("تسجيل سند", "Record instrument")}
          </Button>
        }
      />

      {msg && <div className="p-3 rounded-md bg-secondary text-sm" role="status">{msg}</div>}

      {showForm && (
        <div className="raqeem-card p-4 space-y-3">
          <Label className="text-sm font-semibold">{t("تسجيل سند تأسيس رسمي", "Record an official founding instrument")}</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs" htmlFor="inst-type">{t("نوع السند", "Instrument type")}</Label>
              <select
                id="inst-type"
                value={form.instrument_type}
                onChange={(e) => setForm((f) => ({ ...f, instrument_type: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {INSTRUMENT_TYPES.map((x) => <option key={x.value} value={x.value}>{t(x.ar, x.en)}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs" htmlFor="inst-title-ar">{t("العنوان العربي *", "Arabic title *")}</Label>
              <Input id="inst-title-ar" value={form.title_ar} onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs" htmlFor="inst-title-en">{t("العنوان الإنجليزي", "English title")}</Label>
              <Input id="inst-title-en" dir="ltr" value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs" htmlFor="inst-number">{t("رقم السند", "Instrument number")}</Label>
              <Input id="inst-number" value={form.instrument_number} onChange={(e) => setForm((f) => ({ ...f, instrument_number: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs" htmlFor="inst-authority">{t("جهة الإصدار", "Issuing authority")}</Label>
              <Input id="inst-authority" value={form.issuing_authority} onChange={(e) => setForm((f) => ({ ...f, issuing_authority: e.target.value }))} />
            </div>
            <div>
              <LocalizedDatePicker
                label={t("تاريخ الإصدار", "Issue date")}
                value={form.issue_date}
                onChange={(v) => setForm((f) => ({ ...f, issue_date: v }))}
              />
            </div>
            <div>
              <LocalizedDatePicker
                label={t("تاريخ النفاذ", "Effective date")}
                value={form.effective_date}
                onChange={(v) => setForm((f) => ({ ...f, effective_date: v }))}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="inst-reference">{t("المرجع الرسمي", "Official reference")}</Label>
              <Input id="inst-reference" value={form.official_reference} onChange={(e) => setForm((f) => ({ ...f, official_reference: e.target.value }))} />
            </div>
          </div>
          {form.instrument_type === "other" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs" htmlFor="inst-custom-type">{t("النوع المخصص", "Custom type")}</Label>
                <Input id="inst-custom-type" value={form.custom_type} onChange={(e) => setForm((f) => ({ ...f, custom_type: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs" htmlFor="inst-custom-authority">{t("جهة الإصدار (مخصص)", "Issuing authority (custom)")}</Label>
                <Input id="inst-custom-authority" value={form.issuing_authority_custom} onChange={(e) => setForm((f) => ({ ...f, issuing_authority_custom: e.target.value }))} />
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">{t("الملف الرسمي (PDF / صورة / Word)", "Official file (PDF / image / Word)")}</Label>
            <LocalizedFileUpload
              label={t("رفع الملف الرسمي", "Upload the official file")}
              value={{ file_url: form.file_url, file_name: form.original_filename, file_size: form.file_size }}
              onUpload={handleFile}
            />
          </div>
          <Button size="sm" disabled={uploading || !form.file_url} onClick={submit} className="inline-flex items-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />}
            {t("حفظ السند", "Save instrument")}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8" role="status" aria-live="polite">
          <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">{t("جارٍ التحميل", "Loading")}</span>
        </div>
      ) : instruments.length === 0 ? (
        <div className="raqeem-card p-6 text-center text-sm text-muted-foreground">
          {t(
            "لا توجد سندات تأسيس مسجَّلة. ابدأ بتسجيل السند الرسمي للجنة.",
            "No founding instruments are recorded. Start by recording the committee's official instrument."
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {instruments.map((inst) => (
            <div key={inst.id} className="raqeem-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{inst.title_ar}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {typeLabel(inst.instrument_type)}
                    {inst.instrument_number ? ` · ${inst.instrument_number}` : ""}
                    {inst.issuing_authority ? ` · ${inst.issuing_authority}` : ""}
                    {inst.issue_date ? ` · ${inst.issue_date}` : ""}
                  </div>
                </div>
                <StatusBadge label={statusLabel(inst.document_status)} colorClass={STATUS_COLORS[inst.document_status] || "bg-secondary"} />
              </div>
              {inst.file_url && (
                <div className="flex items-center gap-2">
                  <SecureFileLink
                    fileRef={inst.file_url}
                    action="download"
                    entityType="FoundingInstrument"
                    entityId={inst.id}
                    committeeId={data?.committee?.id}
                    title={inst.original_filename || inst.title_ar}
                    label={inst.original_filename || t("الملف", "File")}
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                  />
                  {inst.signature_detected && (
                    <span className="text-xs text-amber-600 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> {t("توقيع مرصود — غير موثَّق", "Signature detected — not authenticated")}
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
                  {extracting === inst.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />}
                  {t("استخراج بالذكاء الاصطناعي", "AI extraction")}
                </Button>
                {inst.extraction_status === "extracted" && (
                  <span className="text-xs text-green-600">{t("تم الاستخراج — بانتظار المراجعة", "Extracted — awaiting review")}</span>
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
                  {confirming === inst.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                  {t("تأكيد البيانات المستخرجة", "Confirm the extracted data")}
                </Button>
              )}
              {inst.extraction_status === "confirmed" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> {t("تم التأكيد", "Confirmed")}
                  </span>
                  <Button
                    size="sm" variant="default"
                    disabled={creatingDraft === inst.id}
                    onClick={() => createDraftFromInstrument(inst.id)}
                    className="inline-flex items-center gap-2 h-7 text-xs"
                  >
                    {creatingDraft === inst.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />}
                    {t("إنشاء مسودة لجنة من السند", "Create a committee draft from the instrument")}
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

const EXTRACTION_FIELD_LABELS = {
  // Instrument fields
  instrument_type: ["نوع السند", "Instrument type"],
  instrument_number: ["رقم السند", "Instrument number"],
  issuing_authority: ["جهة الإصدار", "Issuing authority"],
  issuer_name: ["اسم المُصدِر", "Issuer name"],
  issuer_capacity: ["صفة المُصدِر", "Issuer capacity"],
  issue_date: ["تاريخ الإصدار", "Issue date"],
  effective_date: ["تاريخ النفاذ", "Effective date"],
  expiry_date: ["تاريخ الانتهاء", "Expiry date"],
  official_reference: ["المرجع الرسمي", "Official reference"],
  jurisdiction: ["الاختصاص", "Jurisdiction"],
  title_ar: ["العنوان (عربي)", "Title (Arabic)"],
  title_en: ["العنوان (إنجليزي)", "Title (English)"],
  // Committee fields
  name_ar: ["الاسم (عربي)", "Name (Arabic)"],
  name_en: ["الاسم (إنجليزي)", "Name (English)"],
  type: ["النوع", "Type"],
  mandate: ["الصلاحية", "Mandate"],
  appointing_authority: ["جهة التعيين", "Appointing authority"],
  term_start: ["بداية المدة", "Term start"],
  term_end: ["نهاية المدة", "Term end"],
  classification: ["التصنيف", "Classification"],
  quorum_count: ["النصاب", "Quorum"],
  voting_rule: ["قاعدة التصويت", "Voting rule"],
  meeting_cadence: ["إيقاع الاجتماعات", "Meeting cadence"],
  chair_name: ["اسم الرئيس", "Chair name"],
  secretary_name: ["اسم الأمين", "Secretary name"],
  // Formation fields
  members: ["الأعضاء", "Members"],
  full_name: ["الاسم الكامل", "Full name"],
  role: ["الدور", "Role"],
  institution_name: ["الجهة الممثلة", "Represented entity"],
  // Governance fields
  governance_rules: ["قواعد الحوكمة", "Governance rules"],
  reporting_requirements: ["متطلبات التقارير", "Reporting requirements"],
};

const CONFIDENCE_LABELS = {
  high: ["عالية", "High"],
  medium: ["متوسطة", "Medium"],
  low: ["منخفضة", "Low"],
};

function ExtractionView({ data }) {
  const { t } = useLanguage();

  const fieldLabel = (k) => {
    const pair = EXTRACTION_FIELD_LABELS[k];
    return pair ? t(pair[0], pair[1]) : k;
  };
  const confidenceLabel = (c) => {
    const pair = CONFIDENCE_LABELS[c];
    return pair ? t(pair[0], pair[1]) : c;
  };

  const sections = [
    { key: "instrument", title: t("بيانات السند", "Instrument data"), fields: data.instrument },
    { key: "committee", title: t("بيانات اللجنة", "Committee data"), fields: data.committee },
    { key: "formation", title: t("التشكيل", "Formation"), fields: data.formation },
    { key: "governance", title: t("الحوكمة", "Governance"), fields: data.governance },
  ];
  return (
    <div className="space-y-2">
      {sections.map((sec) => {
        if (!sec.fields) return null;
        const entries = Object.entries(sec.fields).filter(([, v]) => v && (!v.confidence || v.confidence !== "not_found"));
        if (entries.length === 0) return null;
        return (
          <div key={sec.key}>
            <div className="font-semibold text-foreground">{sec.title}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-1">
              {entries.map(([k, v]) => {
                const val = typeof v === "object" ? v.value : v;
                const conf = typeof v === "object" ? v.confidence : null;
                if (!val) return null;
                return (
                  <div key={k} className="flex items-center gap-1">
                    <span className="text-muted-foreground">{fieldLabel(k)}:</span>
                    <span className="truncate">{String(val).slice(0, 80)}</span>
                    {conf && (
                      <span className={
                        conf === "high" ? "text-green-600" :
                        conf === "medium" ? "text-amber-600" : "text-destructive"
                      }>· {confidenceLabel(conf)}</span>
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