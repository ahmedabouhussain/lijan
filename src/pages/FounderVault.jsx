import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lock,
  BookOpen,
  ScrollText,
  ShieldAlert,
  Target,
  Map as MapIcon,
  Plus,
  X,
  Archive,
} from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import VaultEntryForm from "@/components/raqeem/VaultEntryForm";
import PageNav from "@/components/raqeem/PageNav";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";

const STATUS_LABELS = {
  active: { label: "ساري", color: "bg-emerald-100 text-emerald-700" },
  superseded: { label: "مُستبدل", color: "bg-amber-100 text-amber-700" },
  deprecated: { label: "ملغى", color: "bg-muted text-muted-foreground" },
  planned: { label: "مخطط", color: "bg-state-info-surface text-state-info-ink" },
  in_progress: { label: "جارٍ", color: "bg-amber-100 text-amber-700" },
  completed: { label: "مكتمل", color: "bg-emerald-100 text-emerald-700" },
};

export default function FounderVault() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("adr");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await base44.entities.FounderVaultEntry.list("-created_date", 200);
      setEntries(data || []);
    } catch {
      setEntries([]);
    }
    setLoading(false);
  }

  const byType = (t) =>
    entries
      .filter((e) => e.entry_type === t)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  const handleCreated = () => {
    setShowForm(false);
    load();
  };

  const openForm = (type) => {
    setFormType(type);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageNav />
      {/* Header */}
      <div className="raqeem-card p-5 bg-primary-dark text-primary-foreground" style={{ background: "hsl(var(--primary-dark))" }}>
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-primary-dark" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-primary-foreground/60 mb-1">
              {t("وحدة محمية", "Protected Module")}
            </div>
            <h1 className="text-xl font-bold">{t("خزنة المؤسس", "Founder Vault")}</h1>
            <p className="text-sm text-primary-foreground/70 mt-1">
              العقل الاستراتيجي المحمي للِجان™ — فلسفة المنتج، المعمارية، والقرارات المعمارية المسجلة
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <VaultEntryForm
          type={formType}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      <Tabs defaultValue="book" className="space-y-4">
        <TabsList className="grid grid-cols-2 lg:grid-cols-6 w-full">
          <TabsTrigger value="book" className="text-xs gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> الكتاب المؤسس
          </TabsTrigger>
          <TabsTrigger value="adr" className="text-xs gap-1.5">
            <ScrollText className="w-3.5 h-3.5" /> قرارات معمارية
          </TabsTrigger>
          <TabsTrigger value="principles" className="text-xs gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> مبادئ لا تتغير
          </TabsTrigger>
          <TabsTrigger value="moat" className="text-xs gap-1.5">
            <Target className="w-3.5 h-3.5" /> نقاط التفوق
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="text-xs gap-1.5">
            <MapIcon className="w-3.5 h-3.5" /> خارطة الطريق
          </TabsTrigger>
          <TabsTrigger value="memory" className="text-xs gap-1.5">
            <Archive className="w-3.5 h-3.5" /> الذاكرة المؤسسية
          </TabsTrigger>
        </TabsList>

        {/* Founder Book */}
        <TabsContent value="book" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              الكتاب المؤسس · وثيقة حية تتطور مع المنصة
            </p>
            <button
              onClick={() => openForm("book_chapter")}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> فصل جديد
            </button>
          </div>
          {byType("book_chapter").length === 0 ? (
            <EmptyState icon={BookOpen} title={t("لا توجد فصول بعد", "No chapters yet")} description={t("ابدأ بتوثيق فلسفة المنصة", "Start documenting the platform's philosophy")} />
          ) : (
            byType("book_chapter").map((e) => (
              <div key={e.id} className="raqeem-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-accent">{e.code || `CH-${e.sequence || ""}`}</span>
                  <StatusBadge label={STATUS_LABELS[e.status]?.label || e.status} colorClass={STATUS_LABELS[e.status]?.color} />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{L.title(e)}</h3>
                {e.title && e.title_ar && <p className="text-xs text-muted-foreground mb-3">{e.title}</p>}
                {e.content && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{e.content}</p>
                )}
              </div>
            ))
          )}
        </TabsContent>

        {/* ADRs */}
        <TabsContent value="adr" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("قرارات معمارية مسجلة كأصل تقني", "Architectural Decision Records")}
            </p>
            <button
              onClick={() => openForm("adr")}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> قرار جديد
            </button>
          </div>
          {byType("adr").length === 0 ? (
            <EmptyState icon={ScrollText} title={t("لا توجد قرارات معمارية", "No architectural decisions")} description={t("سجّل أول قرار معماري للمنصة", "Record the platform's first architectural decision")} />
          ) : (
            byType("adr").map((e) => (
              <div key={e.id} className="raqeem-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-accent">{e.code || "ADR"}</span>
                    <StatusBadge label={STATUS_LABELS[e.status]?.label || e.status} colorClass={STATUS_LABELS[e.status]?.color} />
                  </div>
                  {e.superseded_by && (
                    <span className="text-xs text-muted-foreground">استُبدل بـ {e.superseded_by}</span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{L.title(e)}</h3>
                {e.content && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed mt-2">{e.content}</p>
                )}
              </div>
            ))
          )}
        </TabsContent>

        {/* Non-Negotiables */}
        <TabsContent value="principles" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              مبادئ لا تتغير · ما يجب أن تبقىه لِجان وما لا يجوز أن تصبحه
            </p>
            <button
              onClick={() => openForm("non_negotiable")}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> مبدأ جديد
            </button>
          </div>
          {byType("non_negotiable").length === 0 ? (
            <EmptyState icon={ShieldAlert} title={t("لا توجد مبادئ مسجلة", "No principles recorded")} />
          ) : (
            byType("non_negotiable").map((e) => (
              <div key={e.id} className="raqeem-card p-4 flex items-start gap-3">
                <div className="w-1 self-stretch rounded-full bg-primary shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{L.title(e)}</h3>
                  {e.content && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{e.content}</p>}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Competitive Moat */}
        <TabsContent value="moat" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              نقاط التفوق الاستراتيجي · ما يميز لِجان عن منصات الاجتماعات واللوح
            </p>
            <button
              onClick={() => openForm("moat")}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> نقطة تفوق
            </button>
          </div>
          {byType("moat").length === 0 ? (
            <EmptyState icon={Target} title={t("لا توجد نقاط تفوق مسجلة", "No moat entries recorded")} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {byType("moat").map((e, i) => (
                <div key={e.id} className="raqeem-card p-4">
                  <div className="text-xs font-mono text-accent mb-1">{String(i + 1).padStart(2, "0")}</div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{L.title(e)}</h3>
                  {e.content && <p className="text-sm text-muted-foreground leading-relaxed">{e.content}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Roadmap */}
        <TabsContent value="roadmap" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              خارطة طريق المنتج · مراحل البناء
            </p>
            <button
              onClick={() => openForm("roadmap_item")}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> محطة جديدة
            </button>
          </div>
          {byType("roadmap_item").length === 0 ? (
            <EmptyState icon={MapIcon} title={t("لا توجد محطات مسجلة", "No milestones recorded")} />
          ) : (
            <div className="relative space-y-0">
              {byType("roadmap_item").map((e, i) => (
                <div key={e.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/10 shrink-0 mt-1.5" />
                    {i < byType("roadmap_item").length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="raqeem-card p-4 flex-1 mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-foreground">{L.title(e)}</h3>
                      <StatusBadge label={STATUS_LABELS[e.status]?.label || e.status} colorClass={STATUS_LABELS[e.status]?.color} />
                    </div>
                    {e.content && <p className="text-sm text-muted-foreground leading-relaxed">{e.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        {/* Institutional Memory */}
        <TabsContent value="memory" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            الذاكرة المؤسسية · ذاكرة اللجان المغلقة المنقولة من دورة حياة كل لجنة
          </p>
          {byType("institutional_memory").length === 0 ? (
            <EmptyState icon={Archive} title={t("لا توجد ذاكرة مؤسسية بعد", "No institutional memory yet")} description={t("عند إغلاق لجنة، تُنقل ذاكرتها تلقائياً إلى هنا", "When a committee closes, its memory is transferred here automatically")} />
          ) : (
            byType("institutional_memory").map((e) => (
              <div key={e.id} className="raqeem-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Archive className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-mono text-accent">{e.code || "MEM"}</span>
                  <StatusBadge label={STATUS_LABELS[e.status]?.label || e.status} colorClass={STATUS_LABELS[e.status]?.color} />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{L.title(e)}</h3>
                {e.content && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{e.content}</p>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}