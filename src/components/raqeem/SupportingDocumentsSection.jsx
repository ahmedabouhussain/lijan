import React, { useState } from "react";
import { Upload, FileText, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/LanguageContext";
import SecureFileLink from "@/components/raqeem/SecureFileLink";
import { uploadPrivateFile, logFileAccess } from "@/lib/secureFiles";

const DOC_TYPES = [
  { value: "memo", label: "مذكرة" },
  { value: "report", label: "تقرير" },
  { value: "analysis", label: "تحليل" },
  { value: "proposal", label: "مقترح" },
  { value: "evidence", label: "دليل / إثبات" },
  { value: "correspondence", label: "مراسلات" },
  { value: "charter", label: "ميثاق / لائحة" },
  { value: "other", label: "أخرى" },
];

export default function SupportingDocumentsSection({ value, onChange }) {
  const { t } = useLanguage();
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [newDoc, setNewDoc] = useState({ title: "", document_type: "memo" });

  const addDoc = () => {
    if (!newDoc.title.trim()) return;
    onChange([...value, { ...newDoc, file_url: "", file_name: "" }]);
    setNewDoc({ title: "", document_type: "memo" });
  };

  const removeDoc = (i) => onChange(value.filter((_, idx) => idx !== i));

  const handleFile = async (i, file) => {
    if (!file) return;
    setUploadingIdx(i);
    try {
      // Supporting documents are sensitive: stored privately, opened only through a
      // short-lived signed link that is recorded in the audit trail.
      const file_url = await uploadPrivateFile(file);
      await logFileAccess({ action: "upload", fileRef: file_url, entityType: "SupportingDocument", title: file.name });
      onChange(
        value.map((d, idx) =>
          idx === i ? { ...d, file_url, file_name: file.name } : d
        )
      );
    } catch {
      // ignore
    }
    setUploadingIdx(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <Label className="text-sm font-semibold">{t("وثائق داعمة", "Supporting Documents")}</Label>
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((doc, i) => (
            <div key={i} className="p-3 rounded-md border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{doc.title}</span>
                <button
                  onClick={() => removeDoc(i)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-muted-foreground">
                {DOC_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type}
              </div>
              {doc.file_url ? (
                <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-secondary/30 text-xs">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate flex-1">{doc.file_name}</span>
                  <SecureFileLink
                    fileRef={doc.file_url}
                    action="preview"
                    entityType="SupportingDocument"
                    title={doc.title}
                    label={t("معاينة", "Preview")}
                    className="text-primary inline-flex items-center gap-1 hover:underline shrink-0"
                  />
                  <SecureFileLink
                    fileRef={doc.file_url}
                    action="download"
                    entityType="SupportingDocument"
                    title={doc.title}
                    label={t("تنزيل", "Download")}
                    className="text-primary inline-flex items-center gap-1 hover:underline shrink-0"
                  />
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-9 rounded-md border border-dashed border-input cursor-pointer hover:bg-secondary/30 text-xs text-muted-foreground">
                  {uploadingIdx === i ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {uploadingIdx === i ? "جارٍ الرفع..." : "رفع الملف"}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFile(i, e.target.files?.[0])}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            value={newDoc.title}
            onChange={(e) => setNewDoc((d) => ({ ...d, title: e.target.value }))}
            placeholder="عنوان الوثيقة"
            className="text-sm"
          />
        </div>
        <select
          value={newDoc.document_type}
          onChange={(e) => setNewDoc((d) => ({ ...d, document_type: e.target.value }))}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={addDoc}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}