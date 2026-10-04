import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, Sparkles, Loader2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/LanguageContext";
import SecureFileLink from "@/components/raqeem/SecureFileLink";
import { uploadPrivateFile, requestFileAccess, logFileAccess } from "@/lib/secureFiles";

const DOC_TYPES = [
  { value: "decision", label: "قرار" },
  { value: "circular", label: "تعميم" },
  { value: "decree", label: "مرسوم" },
  { value: "resolution", label: "قرار جمهوري / وزاري" },
  { value: "charter", label: "ميثاق / لائحة" },
  { value: "other", label: "أخرى" },
];

export default function EstablishingDocumentSection({ value, onChange, onExtracted }) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState(false);

  const update = (k, v) => onChange({ ...value, [k]: v });

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      // Stored privately: the form keeps the private reference, never a public link.
      const file_url = await uploadPrivateFile(file);
      await logFileAccess({ action: "upload", fileRef: file_url, entityType: "EstablishingDocument", title: file.name });
      onChange({ ...value, file_url, file_name: file.name, file_size: file.size, mime_type: file.type });
    } catch {
      setError(t("تعذّر رفع الملف", "The file could not be uploaded"));
    }
    setUploading(false);
  };

  const extract = async () => {
    if (!value.file_url) {
      setError("ارفع المستند أولاً");
      return;
    }
    setExtracting(true);
    setError("");
    try {
      // The extractor needs a readable link for this one call. It is requested from the
      // governed gate, which serves this draft file only to the user who uploaded it.
      const access = await requestFileAccess({
        fileRef: value.file_url,
        entityType: "EstablishingDocument",
        entityId: value.id,
        action: "preview",
        purpose: "ai_extraction",
      });
      if (!access.url) throw new Error(t("الملف غير متاح", "File unavailable"));
      const res = await base44.functions.invoke("ExtractCommitteeCharter", { file_url: access.url });
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
      } else {
        onExtracted(data);
        setExtracted(true);
      }
    } catch (e) {
      setError(e?.message || "تعذّر الاستخلاص");
    }
    setExtracting(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <Label className="text-sm font-semibold">{t("قرار الإنشاء / ميثاق اللجنة", "Establishing Document")}</Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("نوع المستند", "Document Type")}</Label>
          <select
            value={value.type || ""}
            onChange={(e) => update("type", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">{t("— اختر —", "— Select —")}</option>
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("الرقم المرجعي", "Reference Number")}</Label>
          <Input
            value={value.reference || ""}
            onChange={(e) => update("reference", e.target.value)}
            placeholder={t("رقم القرار / التعميم", "Decision / circular number")}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("تاريخ الإصدار", "Issue Date")}</Label>
          <Input
            type="date"
            value={value.date || ""}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t("رفع المستند (PDF / صورة / Word)", "Upload Document (PDF / image / Word)")}</Label>
        {value.file_url ? (
          <div className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/40 text-sm">
            <span className="truncate flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0 text-primary" />
              {value.file_name || "ملف مرفوع"}
            </span>
            <SecureFileLink
              fileRef={value.file_url}
              action="preview"
              entityType="EstablishingDocument"
              title={value.file_name}
              label={t("معاينة", "Preview")}
              className="text-xs text-primary inline-flex items-center gap-1 hover:underline shrink-0"
            />
            <button
              onClick={() => {
                onChange({ ...value, file_url: "", file_name: "" });
                setExtracted(false);
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 h-10 rounded-md border border-dashed border-input cursor-pointer hover:bg-secondary/30 text-sm text-muted-foreground">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "جارٍ الرفع..." : "اختر ملف"}
            <input
              type="file"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            />
          </label>
        )}
      </div>

      {error && <div className="text-xs text-destructive">{error}</div>}
      {extracted && !error && (
        <div className="text-xs text-green-600 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          تم استخلاص البيانات وتعبئة النموذج — راجعها قبل الإنشاء
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={extract}
        disabled={extracting || !value.file_url}
        className="inline-flex items-center gap-2"
      >
        {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {extracting ? "جارٍ الاستخلاص..." : "استخلاص بيانات اللجنة بالذكاء الاصطناعي"}
      </Button>
    </div>
  );
}