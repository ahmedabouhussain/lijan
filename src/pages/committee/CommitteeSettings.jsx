import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";
import { Settings as SettingsIcon, Edit3, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { L } from "@/lib/l10n";

export default function CommitteeSettings() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("settings");
  const { canManageGovernance } = useCommitteeAdmin();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!data) return <TableSkeleton rows={4} />;
  const { committee, mandate, is_oversight } = data;

  const startEdit = () => {
    setForm({
      name_ar: committee.name_ar || "",
      name_en: committee.name_en || "",
      description: committee.description || "",
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
        icon={SettingsIcon}
        title={getTitle("إعدادات اللجنة", "Committee Settings", lang)}
        actions={canManageGovernance && !editing && !is_oversight && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Edit3 className="w-4 h-4" aria-hidden="true" />
            {t("تحرير الملف", "Edit Profile")}
          </Button>
        )}
      />

      {is_oversight && (
        <div className="p-3 rounded-md bg-secondary/60 border border-border text-xs text-muted-foreground">
          {t("وضع الإشراف: لا يمكنك تعديل إعدادات اللجنة", "Oversight mode: you cannot modify committee settings")}
        </div>
      )}

      {editing ? (
        <div className="raqeem-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("تحرير الملف", "Edit Profile")}</h3>
            <button onClick={() => setEditing(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div><Label>{t("الاسم بالعربية", "Name (Arabic)")}</Label><Input value={form.name_ar} onChange={(e) => setForm(f => ({ ...f, name_ar: e.target.value }))} /></div>
          <div><Label>{t("الاسم بالإنجليزية", "Name (English)")}</Label><Input value={form.name_en} onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
          <div><Label>{t("الوصف", "Description")}</Label><Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
          <Button onClick={submit} disabled={submitting} className="w-full min-h-[44px]">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("حفظ", "Save")}
          </Button>
        </div>
      ) : (
        <>
          <div className="raqeem-card p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("الحالة", "Status")}</span>
              <StatusBadge label={L.label(COMMITTEE_STATUS, committee.status, committee.status)} colorClass={COMMITTEE_STATUS[committee.status]?.color} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("النوع", "Type")}</span>
              <span className="font-medium">{committee.type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("قاعدة التصويت", "Voting Rule")}</span>
              <span className="font-medium">{committee.voting_rule}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("النصاب", "Quorum")}</span>
              <span className="font-medium">{committee.quorum_count}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("دورة الاجتماعات", "Meeting Cadence")}</span>
              <span className="font-medium">{committee.meeting_cadence}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("التصنيف", "Classification")}</span>
              <span className="font-medium">{committee.classification}</span>
            </div>
            {committee.description && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">{t("الوصف", "Description")}</p>
                <p className="text-sm">{committee.description}</p>
              </div>
            )}
          </div>

          <div className="raqeem-card p-4">
            <h3 className="text-sm font-semibold mb-2">{t("الصلاحية", "Mandate")}</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{L.name(committee, "mandate") || L.name(mandate, "text") || t("غير محدد", "Not defined")}</p>
          </div>
        </>
      )}
    </div>
  );
}