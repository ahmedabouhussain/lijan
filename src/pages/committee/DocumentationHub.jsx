import React from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import useDocumentationPack from "@/hooks/useDocumentationPack";
import DocumentationPackHero from "@/components/docs/DocumentationPackHero";
import DocumentationSummary from "@/components/docs/DocumentationSummary";
import DocumentLibrary from "@/components/docs/DocumentLibrary";
import DocumentationQualityPanel from "@/components/docs/DocumentationQualityPanel";

function PageSkeleton({ t }) {
  return (
    <div className="space-y-4">
      <div className="raqeem-card flex items-center gap-3 p-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          {t("جارٍ تحميل بيانات الحزمة...", "Loading pack data...")}
        </span>
      </div>
    </div>
  );
}

export default function DocumentationHub() {
  const pack = useDocumentationPack();
  const { t, isAr, dir, release, loading, notice, setNotice } = pack;

  return (
    <div className="space-y-6" dir={dir}>
      {loading ? (
        <PageSkeleton t={t} />
      ) : !release ? (
        <div className="raqeem-card p-8 text-center">
          <h1 className="font-heading text-lg font-bold text-foreground">
            {t("حزمة الوثائق والمواد التنفيذية", "Documentation & Executive Pack")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "بيانات الإصدار قيد التهيئة. ستظهر الوثائق هنا بمجرد نشر الإصدار المعتمد.",
              "The release records are being prepared. Documents appear here once the approved release is published."
            )}
          </p>
        </div>
      ) : (
        <>
          <DocumentationPackHero
            release={release}
            isAr={isAr}
            t={t}
            onDownloadPack={pack.downloadPack}
            packState={pack.busy.pack}
          />

          {notice && (
            <div
              role="alert"
              className="raqeem-card flex items-start gap-2 border-destructive/40 bg-destructive/5 p-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <p className="flex-1 text-xs text-foreground">{notice.message}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label={t("إغلاق التنبيه", "Dismiss notice")}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {pack.busy.pack === "success" && (
            <div className="raqeem-card flex items-center gap-2 border-emerald-200 bg-emerald-50 p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-xs text-emerald-800">
                {t("تم تجهيز الحزمة الكاملة للتنزيل.", "The complete pack has been prepared for download.")}
              </p>
            </div>
          )}

          <DocumentationSummary release={release} isAr={isAr} />

          <DocumentLibrary
            isAr={isAr}
            t={t}
            items={pack.items}
            filteredItems={pack.filteredItems}
            counts={pack.counts}
            filters={{
              edition: pack.edition,
              category: pack.category,
              format: pack.format,
              kind: pack.kind,
              search: pack.search,
            }}
            onEditionChange={pack.selectEdition}
            onCategoryChange={pack.selectCategory}
            onFilterChange={(name, value) => {
              if (name === "format") pack.setFormat(value);
              if (name === "kind") pack.setKind(value);
              if (name === "search") pack.setSearch(value);
            }}
            onDownload={pack.downloadAsset}
            busy={pack.busy}
          />

          <DocumentationQualityPanel release={release} isAr={isAr} t={t} />

          <p className="pb-2 text-center text-[11px] text-muted-foreground">
            {isAr ? release.classification_ar : release.classification_en}
          </p>
        </>
      )}
    </div>
  );
}