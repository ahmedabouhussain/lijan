import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/raqeem/EmptyState";
import PageHeader from "@/components/raqeem/PageHeader";
import ProductViewer from "@/components/raqeem/ProductViewer";
import { FileText, Search, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { L } from "@/lib/l10n";
import { CLASSIFICATION } from "@/lib/raqeemUtils";

const STATUS_FILTERS = [
  { value: "all", label_ar: "الكل", label_en: "All" },
  { value: "generated", label_ar: "مُولّد", label_en: "Generated" },
  { value: "approved", label_ar: "معتمد", label_en: "Approved" },
  { value: "published", label_ar: "منشور", label_en: "Published" },
];

export default function ReportCenter() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const orgId = data?.committee?.organization_id;
  const committeeId = data?.committee?.id;

  const fetchInstances = async () => {
    try {
      const query = committeeId
        ? { committee_id: committeeId }
        : { organization_id: orgId };
      const res = await base44.entities.ProductInstance.filter(query, "-created_date", 100);
      setInstances(res || []);
    } catch { setInstances([]); }
    setLoading(false);
  };

  useEffect(() => { fetchInstances(); }, [committeeId, orgId]);

  const approve = async (id) => {
    try {
      const me = await base44.auth.me();
      await base44.entities.ProductInstance.update(id, {
        status: "approved",
        approved_by_name: me.full_name || me.email,
        approved_by_user_id: me.id,
        approved_at: new Date().toISOString(),
        human_edited: true,
      });
      fetchInstances();
      if (selected?.id === id) setSelected((prev) => ({ ...prev, status: "approved" }));
    } catch {}
  };

  const filtered = instances.filter((inst) => {
    if (statusFilter !== "all" && inst.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return inst.title?.toLowerCase().includes(q) || inst.product_type?.includes(q);
    }
    return true;
  });

  if (selected) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          {lang === "ar" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {t("العودة للقائمة", "Back to list")}
        </button>
        <ProductViewer product={selected} lang={lang} />
        {selected.status === "generated" && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => approve(selected.id)}>
              <Check className="w-4 h-4" /> {t("اعتماد المنتج", "Approve Product")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FileText}
        title={t("مركز التقارير", "Report Center")}
        badge={<span className="text-sm text-muted-foreground">({instances.length})</span>}
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label={t("ابحث...", "Search...")} value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ابحث...", "Search...")}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${statusFilter === f.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {lang === "ar" ? f.label_ar : f.label_en}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title={t("لا توجد منتجات", "No Products")} description={t("لم يتم إنشاء أي منتجات بعد.", "No products generated yet.")} />
      ) : (
        <div className="space-y-2">
          {filtered.map((inst) => (
            <div
              key={inst.id}
              onClick={() => setSelected(inst)}
              className="raqeem-card p-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/20"
            >
              <div className="w-9 h-9 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{L.title(inst)}</div>
                <div className="text-xs text-muted-foreground">
                  {inst.product_type} · {inst.export_format?.toUpperCase()} · {L.label(CLASSIFICATION, inst.classification, inst.classification)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  inst.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                  inst.status === "published" ? "bg-green-100 text-green-700" :
                  inst.status === "generated" ? "bg-state-info-surface text-state-info-ink" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {inst.status === "approved" ? t("معتمد", "Approved") :
                   inst.status === "published" ? t("منشور", "Published") :
                   inst.status === "generated" ? t("مُولّد", "Generated") :
                   inst.status}
                </span>
                {lang === "ar" ? <ChevronLeft className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}