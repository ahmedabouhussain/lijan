import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, CheckCircle2, Copy } from "lucide-react";
import { QUALITY_POINTS } from "@/lib/docs/releaseLabels";

export default function DocumentationQualityPanel({ release, isAr, t }) {
  const [copied, setCopied] = useState(false);
  const checksum = release?.sha256 || "";

  const copyChecksum = async () => {
    try {
      await navigator.clipboard.writeText(checksum);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="raqeem-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          {isAr ? "الجودة والالتزام" : "Quality & Compliance"}
        </h2>
        <ul className="space-y-2.5">
          {QUALITY_POINTS.map((point, index) => (
            <li key={index} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>{isAr ? point.ar : point.en}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="raqeem-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          {isAr ? "بصمة الإصدار" : "Release Checksum"}
        </h2>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          {isAr
            ? "تُستخدم هذه البصمة للتحقق من مطابقة النسخة المنزَّلة للإصدار المعتمد 1.1."
            : "This checksum verifies that a downloaded copy matches approved release 1.1."}
        </p>
        <div className="flex items-center gap-2">
          <Input value={checksum} readOnly dir="ltr" aria-label={t("بصمة SHA-256", "SHA-256 checksum")} className="font-mono text-[11px]" />
          <Button type="button" variant="outline" size="sm" onClick={copyChecksum} className="gap-1.5 shrink-0">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("تم النسخ", "Copied") : t("نسخ", "Copy")}
          </Button>
        </div>
      </div>
    </section>
  );
}