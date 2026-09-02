import React, { useRef, useState } from "react";
import { Upload, Sparkles, X, Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";

const TYPE_LABELS_AR = {
  permanent_council: "مجلس دائم",
  permanent_committee: "لجنة دائمة",
  temporary_committee: "لجنة مؤقتة",
  ministerial_committee: "لجنة وزارية",
  national_committee: "لجنة وطنية",
  task_force: "فريق عمل",
  working_group: "مجموعة عمل",
  advisory_committee: "لجنة استشارية",
  special_committee: "لجنة خاصة",
  joint_committee: "لجنة مشتركة",
  cross_institutional: "بين المؤسسات",
};

export default function CommitteeLogoSection({ value, onChange, committeeInfo }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch (err) {
      setError("تعذّر رفع الشعار");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const { name_ar, name_en, type, mandate } = committeeInfo || {};
      const typeLabel = TYPE_LABELS_AR[type] || type || "لجنة";
      const prompt = [
        `Design a professional, minimalist institutional logo/emblem for a ${typeLabel}.`,
        name_ar && `Committee name (Arabic): "${name_ar}".`,
        name_en && `Committee name (English): "${name_en}".`,
        mandate && `Mandate/scope: ${mandate.substring(0, 200)}.`,
        "Style: sovereign-grade, official government seal aesthetic, clean geometric shapes,",
        "deep maroon (#8A1538) and warm gold accents on a transparent or white background,",
        "centered, symmetrical, no text, scalable vector-style emblem, formal and authoritative.",
      ].filter(Boolean).join(" ");

      const result = await base44.integrations.Core.GenerateImage({ prompt });
      if (result?.url) {
        onChange(result.url);
      } else {
        setError("تعذّر إنشاء الشعار");
      }
    } catch (err) {
      setError("تعذّر إنشاء الشعار بالذكاء الاصطناعي");
    }
    setGenerating(false);
  };

  const handleRemove = () => onChange("");

  const busy = uploading || generating;

  return (
    <div className="space-y-2">
      <Label>شعار اللجنة · Committee Logo</Label>

      {value ? (
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 rounded-lg border border-border bg-secondary/30 flex items-center justify-center overflow-hidden shrink-0">
            <img src={value} alt="logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              <Upload className="w-3.5 h-3.5" /> تغيير
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleRemove} disabled={busy} className="text-muted-foreground">
              <X className="w-3.5 h-3.5" /> إزالة
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex-1 justify-start"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading ? "جارٍ الرفع..." : "رفع من الجهاز"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerate}
            disabled={busy || (!committeeInfo?.name_ar && !committeeInfo?.name_en)}
            className="flex-1 justify-start"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "جارٍ الإنشاء..." : "إنشاء بالذكاء الاصطناعي"}
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!value && (
        <p className="text-xs text-muted-foreground">
          ارفع شعار اللجنة من جهازك أو ولّده تلقائيًا بالذكاء الاصطناعي من واقع اسم اللجنة ونوعها وصلاحياتها.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}