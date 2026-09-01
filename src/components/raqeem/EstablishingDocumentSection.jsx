import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, Sparkles, Loader2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DOC_TYPES = [
  { value: "decision", label: "قرار" },
  { value: "circular", label: "تعميم" },
  { value: "decree", label: "مرسوم" },
  { value: "resolution", label: "قرار جمهوري / وزاري" },
  { value: "charter", label: "ميثاق / لائحة" },
  { value: "other", label: "أخرى" },
];

export default function EstablishingDocumentSection({ value, onChange, onExtracted }) {
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
      const res = await base44.integrations.Core.UploadFile({ file });
      const file_url = res.file_url || res;
      onChange({ ...value, file_url, file_name: file.name });
    } catch (e) {
      setError("تعذّر رفع الملف");
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
      const res = await base44.functions.invoke("ExtractCommitteeCharter", { file_url: value.file_url });
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
        <Label className="text-sm font-semibold">قرار الإنشاء / ميثاق اللجنة · Establishing Document</Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">نوع المستند</Label>
          <select
            value={value.type || ""}
            onChange={(e) => update("type", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">— اختر —</option>
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">الرقم المرجعي</Label>
          <Input
            value={value.reference || ""}
            onChange={(e) => update("reference", e.target.value)}
            placeholder="رقم القرار / التعميم"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">تاريخ الإصدار</Label>
          <Input
            type="date"
            value={value.date || ""}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">رفع المستند (PDF / صورة / Word)</Label>
        {value.file_url ? (
          <div className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/40 text-sm">
            <span className="truncate flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0 text-primary" />
              {value.file_name || "ملف مرفوع"}
            </span>
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