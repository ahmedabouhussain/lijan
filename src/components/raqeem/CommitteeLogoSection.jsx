import React, { useRef, useState } from "react";
import { Upload, Sparkles, X, Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { COMMITTEE_TYPES } from "@/lib/raqeemUtils";

export default function CommitteeLogoSection({ value, onChange, committeeInfo }) {
  const { t } = useLanguage();
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
      // The committee logo is an APPROVED PUBLIC IDENTITY ASSET: a committee's mark is
      // published with its public registration, so it is deliberately uploaded to public
      // storage. Every sensitive governance file goes through private storage instead
      // (see lib/secureFiles.js) — this is the only public upload path in the app.
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch {
      setError(t("تعذّر رفع الشعار", "Could not upload the logo"));
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const { name_ar, name_en, type, mandate } = committeeInfo || {};
      const typeLabel = COMMITTEE_TYPES[type]?.en || type || "Committee";
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
        setError(t("تعذّر إنشاء الشعار", "Could not create the logo"));
      }
    } catch {
      setError(t("تعذّر إنشاء الشعار بالذكاء الاصطناعي", "Could not generate the logo with AI"));
    }
    setGenerating(false);
  };

  const handleRemove = () => onChange("");

  const busy = uploading || generating;

  return (
    <div className="space-y-2">
      <Label>{t("شعار اللجنة", "Committee Logo")}</Label>

      {value ? (
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 rounded-lg border border-border bg-secondary/30 flex items-center justify-center overflow-hidden shrink-0">
            <img src={value} alt="logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              <Upload className="w-3.5 h-3.5" /> {t("تغيير", "Change")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleRemove} disabled={busy} className="text-muted-foreground">
              <X className="w-3.5 h-3.5" /> {t("إزالة", "Remove")}
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
            {uploading ? t("جارٍ الرفع...", "Uploading…") : t("رفع من الجهاز", "Upload from device")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerate}
            disabled={busy || (!committeeInfo?.name_ar && !committeeInfo?.name_en)}
            className="flex-1 justify-start"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? t("جارٍ الإنشاء...", "Generating…") : t("إنشاء بالذكاء الاصطناعي", "Generate with AI")}
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
          {t(
            "ارفع شعار اللجنة من جهازك أو ولّده تلقائيًا بالذكاء الاصطناعي من واقع اسم اللجنة ونوعها وصلاحياتها.",
            "Upload the committee logo from your device, or generate one from the committee's name, type and mandate."
          )}
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}