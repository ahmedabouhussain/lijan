import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/raqeem/EmptyState";
import PageHeader from "@/components/raqeem/PageHeader";
import GenerateWizard from "@/components/raqeem/GenerateWizard";
import LivingProductDelta from "@/components/raqeem/LivingProductDelta";
import { FileText, Loader2, Sparkles, Search, FileCheck, Gavel, FileSpreadsheet, ClipboardList, BookOpen, ScrollText, Mail, Vote, BarChart3, ShieldAlert, Scale, FileArchive, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRODUCT_ICONS = {
  meeting_minutes: FileText,
  decision_document: Gavel,
  committee_charter: ScrollText,
  formation_decision: FileCheck,
  amendment_decision: FileCheck,
  action_report: ClipboardList,
  annual_report: BarChart3,
  quarterly_report: BarChart3,
  committee_report: FileText,
  attendance_report: FileCheck,
  voting_record: Vote,
  executive_summary: FileText,
  policy_brief: FileSpreadsheet,
  risk_report: ShieldAlert,
  escalation_report: ShieldAlert,
  audit_report: FileArchive,
  governance_report: Scale,
  memory_transfer: BookOpen,
  meeting_pack: FileText,
  agenda: ClipboardList,
  invitation_letter: Mail,
  resolution: Gavel,
  compliance_report: ShieldAlert,
  custom: FileText,
};

const PRODUCT_CATEGORIES = {
  governance: { ar: "الحوكمة", en: "Governance" },
  meetings: { ar: "الاجتماعات", en: "Meetings" },
  decisions: { ar: "القرارات", en: "Decisions" },
  reports: { ar: "التقارير", en: "Reports" },
  compliance: { ar: "الامتثال", en: "Compliance" },
  correspondence: { ar: "المراسلات", en: "Correspondence" },
};

export default function ProductCatalog({ onGenerate }) {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { canManageGovernance } = useCommitteeAdmin();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState("");
  const [category, setCategory] = useState("all");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [lastProductDate, setLastProductDate] = useState(null);

  const orgId = data?.committee?.organization_id;
  const committeeId = data?.committee?.id;

  const fetchTemplates = async () => {
    try {
      const [orgRes, platformRes] = await Promise.all([
        base44.entities.ProductTemplate.filter({ organization_id: orgId }).catch(() => []),
        base44.entities.ProductTemplate.filter({ organization_id: null }).catch(() => []),
      ]);
      // Merge: org templates override platform templates by product_type
      const byType = {};
      [...(platformRes || []), ...(orgRes || [])].forEach((tmpl) => {
        byType[tmpl.product_type] = tmpl;
      });
      setTemplates(Object.values(byType));
    } catch { setTemplates([]); }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, [orgId]);

  // Fetch last product generation date for Living Product Delta™
  useEffect(() => {
    if (!committeeId) return;
    (async () => {
      try {
        const products = await base44.entities.ProductInstance.filter(
          { committee_id: committeeId },
          "-generated_at",
          1
        );
        if (products && products[0]?.generated_at) {
          setLastProductDate(products[0].generated_at);
        }
      } catch {}
    })();
  }, [committeeId]);

  const handleGenerate = async (template) => {
    setGenerating(template.product_type);
    try {
      const res = await base44.functions.invoke("GenerateProduct", {
        product_type: template.product_type,
        organization_id: orgId,
        committee_id: committeeId,
        title: template.name_ar,
        export_format: template.default_format || "pdf",
      });
      const d = res.data || res;
      if (d.error) { alert(d.error); }
      else if (onGenerate) { onGenerate(d); }
    } catch (e) { alert(e?.message || "Error"); }
    setGenerating("");
  };

  const handleWizardGenerate = async ({ type, scope, format }) => {
    setGenerating(type);
    try {
      const res = await base44.functions.invoke("GenerateProduct", {
        product_type: type,
        organization_id: orgId,
        committee_id: committeeId,
        title: t("منتج جديد", "New Product"),
        export_format: format,
        scope,
      });
      const d = res.data || res;
      if (d.error) { alert(d.error); }
      else if (onGenerate) { onGenerate(d); }
    } catch (e) { alert(e?.message || "Error"); }
    setGenerating("");
  };

  const filtered = templates.filter((tmpl) => {
    if (category !== "all" && tmpl.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return tmpl.name_ar?.includes(search) || tmpl.name_en?.toLowerCase().includes(q) || tmpl.product_type?.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FileText}
        title={t("مركز الوثائق", "Document Center")}
        badge={<span className="text-sm text-muted-foreground">({templates.length})</span>}
        actions={
          <Button size="sm" onClick={() => setWizardOpen(true)}>
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {t("معالج الإنشاء", "Generate Wizard")}
          </Button>
        }
      />

      <GenerateWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onGenerate={handleWizardGenerate}
        committeeName={data?.committee?.name_ar || data?.committee?.name_en}
      />

      {/* Living Institutional Product™ — Section 6: what changed since last version */}
      {lastProductDate && (
        <div className="raqeem-card p-4">
          <LivingProductDelta
            committeeId={committeeId}
            lastGeneratedAt={lastProductDate}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ابحث عن منتج...", "Search products...")}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setCategory("all")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium ${category === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
        >
          {t("الكل", "All")}
        </button>
        {Object.entries(PRODUCT_CATEGORIES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${category === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {lang === "ar" ? label.ar : label.en}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title={t("لا توجد قوالب", "No Templates")} description={t("لم يتم تكوين قوالب منتجات.", "No product templates configured.")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((tmpl) => {
            const Icon = PRODUCT_ICONS[tmpl.product_type] || FileText;
            const catLabel = PRODUCT_CATEGORIES[tmpl.category] || PRODUCT_CATEGORIES.governance;
            return (
              <div key={tmpl.id} className="raqeem-card p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold truncate">{lang === "ar" ? tmpl.name_ar : tmpl.name_en || tmpl.name_ar}</h3>
                    <p className="text-xs text-muted-foreground">{lang === "ar" ? catLabel.ar : catLabel.en}</p>
                  </div>
                </div>
                {tmpl.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p>
                )}
                <div className="flex items-center gap-2 mt-auto">
                  <Button
                    size="sm"
                    disabled={generating === tmpl.product_type}
                    onClick={() => handleGenerate(tmpl)}
                    className="flex-1"
                  >
                    {generating === tmpl.product_type ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("جارٍ الإنشاء...", "Generating...")}</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /> {t("إنشاء", "Generate")}</>
                    )}
                  </Button>
                  <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">
                    {tmpl.default_format?.toUpperCase() || "PDF"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}