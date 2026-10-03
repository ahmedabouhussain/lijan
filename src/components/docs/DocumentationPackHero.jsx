import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Lock, Package } from "lucide-react";

const LIJAN_LOGO = "https://base44.app/api/apps/6a96a0e0cd5dac701b62b7f5/files/mp/public/6a96a0e0cd5dac701b62b7f5/fcef2238e_LIJAN_Approved_Logo.png";
const CONNECTION_LOGO = "https://base44.app/api/apps/6a96a0e0cd5dac701b62b7f5/files/mp/public/6a96a0e0cd5dac701b62b7f5/85e72631e_CONNECTION_Approved_Logo.png";

function formatSize(bytes) {
  if (!bytes) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentationPackHero({ release, isAr, t, onDownloadPack, packState, title, description }) {
  const busy = packState === "loading";
  const summaryParts = [
    "ZIP",
    release ? `${release.total_files} ${isAr ? "ملفًا" : "files"}` : null,
    formatSize(release?.zip_size_bytes),
    isAr ? "إصدار نشط" : "Active release",
  ].filter(Boolean);

  return (
    <section className="raqeem-card p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <img
              src={LIJAN_LOGO}
              alt={isAr ? "شعار منصة لجان™" : "LIJAN™ platform logo"}
              className="h-9 w-auto object-contain"
              loading="eager"
            />
            <span className="h-7 w-px bg-border" aria-hidden="true" />
            <img
              src={CONNECTION_LOGO}
              alt={isAr ? "شعار CONNECTION™" : "CONNECTION™ logo"}
              className="h-7 w-auto object-contain"
              loading="eager"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-accent/60 text-accent-foreground">
              {isAr ? release?.release_badge_ar : release?.release_badge_en}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              {isAr ? "حزمة مؤسسية" : "Institutional pack"}
            </Badge>
          </div>

          <div>
            <h1 className="font-heading text-2xl font-bold leading-snug text-foreground">
              {title || (isAr ? release?.title_ar : release?.title_en)}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {description || (isAr ? release?.subtitle_ar : release?.subtitle_en)}
            </p>
          </div>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{isAr ? release?.classification_ar : release?.classification_en}</span>
          </p>
        </div>

        <div className="w-full space-y-3 lg:w-72">
          <Button onClick={onDownloadPack} disabled={busy || !release} size="lg" className="w-full gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            {isAr ? "تنزيل الحزمة الكاملة" : "Download Complete Pack"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{summaryParts.join(" · ")}</p>
          {packState === "success" && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> {isAr ? "بدأ تنزيل الحزمة" : "Pack download started"}
            </p>
          )}
          {release?.status_note_en && (
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              {isAr ? release.status_note_ar : release.status_note_en}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}