import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import { ScrollText, Edit3, X, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { L } from "@/lib/l10n";

export default function CommitteeMandate() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle } = usePageConfig("mandate");
  const { canManageGovernance } = useCommitteeAdmin();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!data) return <TableSkeleton rows={4} />;
  const { committee, mandate, is_oversight } = data;

  // One language per page: display and edit both resolve the ACTIVE language's own field,
  // never the other language's text.
  const KEY = {
    mandate: lang === "ar" ? "mandate" : "mandate_en",
    scope: lang === "ar" ? "scope" : "scope_en",
    establishing_authority: lang === "ar" ? "establishing_authority" : "establishing_authority_en",
    reporting_requirements: lang === "ar" ? "reporting_requirements" : "reporting_requirements_en",
  };
  const mandateText = L.name(committee, "mandate") || L.name(mandate, "text");
  const scopeText = L.name(committee, "scope") || L.name(mandate, "scope");
  const estAuth = L.name(committee, "establishing_authority") || L.name(mandate, "establishing_authority");
  const appointingAuth = L.name(committee, "appointing_authority");

  const startEdit = () => {
    setForm({
      [KEY.mandate]: mandateText || "",
      [KEY.scope]: scopeText || "",
      [KEY.establishing_authority]: estAuth || "",
      [KEY.reporting_requirements]: L.name(committee, "reporting_requirements") || "",
    });
    setEditing(true);
    setError("");
  };

  const submit = async () => {
    setSubmitting(true); setError("");
    try {
      await base44.entities.Committee.update(committee.id, form);
      setEditing(false);
      reload();
    } catch (e) { setError(e?.response?.data?.error || e?.message || t("فشلت العملية", "Operation failed")); }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ScrollText}
        title={getTitle("الصلاحية", "Mandate", lang)}
        actions={canManageGovernance && !editing && !is_oversight && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Edit3 className="w-4 h-4" aria-hidden="true" />
            {t("تحرير الصلاحية", "Edit Mandate")}
          </Button>
        )}
      />

      {editing ? (
        <div className="raqeem-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("تحرير الصلاحية", "Edit Mandate")}</h3>
            <button onClick={() => setEditing(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="p-2 rounded-md bg-secondary/60 text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            {t("التغييرات الجوهرية في الصلاحية تتطلب تعديلاً رسمياً مع تاريخ سريان.", "Material mandate changes require a formal amendment with effective date.")}
          </div>
          <div><Label>{t("نص الصلاحية", "Mandate Text")}</Label><Textarea aria-label={t("نص الصلاحية", "Mandate Text")} value={form[KEY.mandate] || ""} onChange={(e) => setForm(f => ({ ...f, [KEY.mandate]: e.target.value }))} rows={4} /></div>
          <div><Label>{t("النطاق والمسؤوليات", "Scope & Responsibilities")}</Label><Textarea aria-label={t("النطاق والمسؤوليات", "Scope & Responsibilities")} value={form[KEY.scope] || ""} onChange={(e) => setForm(f => ({ ...f, [KEY.scope]: e.target.value }))} rows={3} /></div>
          <div><Label>{t("الجهة المؤسِّسة", "Establishing Authority")}</Label><Input aria-label={t("الجهة المؤسِّسة", "Establishing Authority")} value={form[KEY.establishing_authority] || ""} onChange={(e) => setForm(f => ({ ...f, [KEY.establishing_authority]: e.target.value }))} /></div>
          <div><Label>{t("متطلبات التقارير", "Reporting Requirements")}</Label><Textarea aria-label={t("متطلبات التقارير", "Reporting Requirements")} value={form[KEY.reporting_requirements] || ""} onChange={(e) => setForm(f => ({ ...f, [KEY.reporting_requirements]: e.target.value }))} rows={2} /></div>
          <Button onClick={submit} disabled={submitting} className="w-full min-h-[44px]">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("حفظ", "Save")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="raqeem-card p-4">
            <h3 className="text-sm font-semibold mb-2">{t("نص الصلاحية", "Mandate Text")}</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{mandateText || t("غير محدد", "Not defined")}</p>
          </div>
          {scopeText && (
            <div className="raqeem-card p-4">
              <h3 className="text-sm font-semibold mb-2">{t("النطاق والمسؤوليات", "Scope & Responsibilities")}</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{scopeText}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="raqeem-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-1">{t("الجهة المؤسِّسة", "Establishing Authority")}</h3>
              <p className="text-sm">{estAuth || "—"}</p>
            </div>
            <div className="raqeem-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-1">{t("الجهة المعيِّنة", "Appointing Authority")}</h3>
              <p className="text-sm">{appointingAuth || "—"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}