import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import { ScrollText, Edit3, X, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CommitteeMandate() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("mandate");
  const { canManageGovernance } = useCommitteeAdmin();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!data) return null;
  const { committee, mandate, is_oversight } = data;

  const startEdit = () => {
    setForm({
      mandate: committee.mandate || mandate?.text || "",
      scope: committee.scope || mandate?.scope || "",
      establishing_authority: committee.establishing_authority || mandate?.establishing_authority || "",
      reporting_requirements: committee.reporting_requirements || mandate?.reporting_requirements || "",
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
    } catch (e) { setError(e?.response?.data?.error || e?.message || "Failed"); }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("الصلاحية", "Mandate", lang)}</h1>
        </div>
        {canManageGovernance && !editing && !is_oversight && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Edit3 className="w-4 h-4" />
            {t("تحرير الصلاحية", "Edit Mandate")}
          </Button>
        )}
      </div>

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
          <div><Label>{t("نص الصلاحية", "Mandate Text")}</Label><Textarea value={form.mandate} onChange={(e) => setForm(f => ({ ...f, mandate: e.target.value }))} rows={4} /></div>
          <div><Label>{t("النطاق والمسؤوليات", "Scope & Responsibilities")}</Label><Textarea value={form.scope} onChange={(e) => setForm(f => ({ ...f, scope: e.target.value }))} rows={3} /></div>
          <div><Label>{t("الجهة المؤسِّسة", "Establishing Authority")}</Label><Input value={form.establishing_authority} onChange={(e) => setForm(f => ({ ...f, establishing_authority: e.target.value }))} /></div>
          <div><Label>{t("متطلبات التقارير", "Reporting Requirements")}</Label><Textarea value={form.reporting_requirements} onChange={(e) => setForm(f => ({ ...f, reporting_requirements: e.target.value }))} rows={2} /></div>
          <Button onClick={submit} disabled={submitting} className="w-full min-h-[44px]">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("حفظ", "Save")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="raqeem-card p-4">
            <h3 className="text-sm font-semibold mb-2">{t("نص الصلاحية", "Mandate Text")}</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{mandate?.text || committee.mandate || t("غير محدد", "Not defined")}</p>
          </div>
          {(committee.scope || mandate?.scope) && (
            <div className="raqeem-card p-4">
              <h3 className="text-sm font-semibold mb-2">{t("النطاق والمسؤوليات", "Scope & Responsibilities")}</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{committee.scope || mandate.scope}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="raqeem-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-1">{t("الجهة المؤسِّسة", "Establishing Authority")}</h3>
              <p className="text-sm">{committee.establishing_authority || mandate?.establishing_authority || "—"}</p>
            </div>
            <div className="raqeem-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-1">{t("الجهة المعيِّنة", "Appointing Authority")}</h3>
              <p className="text-sm">{committee.appointing_authority || "—"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}