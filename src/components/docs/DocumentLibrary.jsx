import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Search } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_ORDER, FORMAT_LABELS } from "@/lib/docs/releaseLabels";
import DocumentCard from "@/components/docs/DocumentCard";

const FORMAT_OPTIONS = ["docx", "pdf", "pptx", "xlsx"];

export default function DocumentLibrary({
  isAr,
  t,
  items,
  filteredItems,
  counts,
  filters,
  onFilterChange,
  onCategoryChange,
  onEditionChange,
  onDownload,
  busy,
}) {
  const grouped = CATEGORY_ORDER.map((key) => ({
    key,
    label: isAr ? CATEGORY_LABELS[key].ar : CATEGORY_LABELS[key].en,
    items: filteredItems.filter((item) => item.category === key),
  })).filter((group) => group.items.length > 0);

  return (
    <section className="space-y-4">
      <div className="raqeem-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />

          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground ltr:left-2.5 rtl:right-2.5" />
            <Input
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              placeholder={t("بحث في عناوين الوثائق ووصفها", "Search document titles and descriptions")}
              aria-label={t("بحث في الوثائق", "Search documents")}
              className="ltr:pl-8 rtl:pr-8"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-secondary/60 p-1" role="group" aria-label={t("اختيار اللغة", "Language selection")}>
            <button
              type="button"
              onClick={() => onEditionChange("ar")}
              aria-pressed={filters.edition === "ar"}
              className={
                filters.edition === "ar"
                  ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              }
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => onEditionChange("en")}
              aria-pressed={filters.edition === "en"}
              className={
                filters.edition === "en"
                  ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              }
            >
              English
            </button>
          </div>

          <Select value={filters.category} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[190px]" aria-label={t("التصنيف", "Category")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("كل الأقسام", "All Categories")}</SelectItem>
              {CATEGORY_ORDER.map((key) => (
                <SelectItem key={key} value={key}>
                  {isAr ? CATEGORY_LABELS[key].ar : CATEGORY_LABELS[key].en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.format} onValueChange={(value) => onFilterChange("format", value)}>
            <SelectTrigger className="w-[150px]" aria-label={t("الصيغة", "Format")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("كل الصيغ", "All Formats")}</SelectItem>
              {FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {FORMAT_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.kind} onValueChange={(value) => onFilterChange("kind", value)}>
            <SelectTrigger className="w-[190px]" aria-label={t("نوع الوثيقة", "Document type")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("كل الوثائق", "All Documents")}</SelectItem>
              <SelectItem value="editable">{t("قابلة للتحرير فقط", "Editable only")}</SelectItem>
              <SelectItem value="archival">{t("أرشيفية فقط", "Archival only")}</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground ltr:ml-auto rtl:mr-auto">
            {counts.filtered} {isAr ? "من" : "of"} {items.length} {isAr ? "وثيقة" : "documents"}
          </span>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="raqeem-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            {t("لا توجد وثائق مطابقة للتصفية الحالية", "No documents match the current filters")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("يمكنك تعديل اللغة أو القسم أو الصيغة لعرض وثائق أخرى.", "Adjust the language, category, or format to see other documents.")}
          </p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
              <span className="text-xs text-muted-foreground tabular-nums">({group.items.length})</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <DocumentCard
                  key={item.deliverable_id}
                  item={item}
                  isAr={isAr}
                  t={t}
                  busy={busy}
                  onDownload={onDownload}
                  categoryLabel={isAr ? CATEGORY_LABELS[item.category]?.ar : CATEGORY_LABELS[item.category]?.en}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}