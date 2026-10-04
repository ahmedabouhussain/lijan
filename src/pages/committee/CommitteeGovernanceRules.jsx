import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import { Scale, Edit3, X, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";

const VOTING_RULES = [
  { value: "simple_majority", label_ar: "أغلبية بسيطة", label_en: "Simple Majority" },
  { value: "two_thirds", label_ar: "ثلثان", label_en: "Two Thirds" },
  { value: "unanimous", label_ar: "إجماع", label_en: "Unanimous" },
  { value: "chair_decides", label_ar: "الرئيس يقرر", label_en: "Chair Decides" },
];

const CADENCE = [
  { value: "weekly", label_ar: "أسبوعي", label_en: "Weekly" },
  { value: "biweekly", label_ar: "كل أسبوعين", label_en: "Biweekly" },
  { value: "monthly", label_ar: "شهري", label_en: "Monthly" },
  { value: "quarterly", label_ar: "ربع سنوي", label_en: "Quarterly" },
  { value: "ad_hoc", label_ar: "حسب الحاجة", label_en: "Ad Hoc" },
];

const CLASSIFICATION = [
  { value: "public", label_ar: "عام", label_en: "Public" },
  { value: "internal", label_ar: "داخلي", label_en: "Internal" },
  { value: "confidential", label_ar: "سري", label_en: "Confidential" },
  { value: "restricted", label_ar: "مقيّد", label_en: "Restricted" },
];

export default function CommitteeGovernanceRules() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle } = usePageConfig("governance-rules");
  const { canManageGovernance } = useCommitteeAdmin();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!data) return <TableSkeleton rows={4} />;
  const { committee, is_oversight } = data;

  const startEdit = () => {
    setForm({
      quorum_count: committee.quorum_count || 3,
      voting_rule: committee.voting_rule || "simple_majority",
      meeting_cadence: committee.meeting_cadence || "monthly",
      classification: committee.classification || "internal",
    });
    setEditing(true);
    setError("");
  };

  const submit = async () => {
    setSubmitting(true); setError("");
    try {
      await base44.entities.Committee.update(committee.id, {
        quorum_count: Number(form.quorum_count),
        voting_rule: form.voting_rule,
        meeting_cadence: form.meeting_cadence,
        classification: form.classification,
      });
      setEditing(false);
      reload();
    } catch (e) { setError(e?.response?.data?.error || e?.message || t("فشلت العملية", "Operation failed")); }
    setSubmitting(false);
  };

  // A stored value is shown as its localized label — a raw key (simple_majority,
  // confidential …) is never printed to the reader.
  const optionLabel = (options, key) => {
    const found = options.find((o) => o.value === key);
    return found ? t(found.label_ar, found.label_en) : key || "";
  };

  const rules = [
    { label: t("قاعدة التصويت", "Voting Rule"), value: optionLabel(VOTING_RULES, committee.voting_rule) },
    { label: t("النصاب", "Quorum"), value: committee.quorum_count },
    { label: t("دورة الاجتماعات", "Meeting Cadence"), value: optionLabel(CADENCE, committee.meeting_cadence) },
    { label: t("التصنيف", "Classification"), value: optionLabel(CLASSIFICATION, committee.classification) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Scale}
        title={getTitle("قواعد الحوكمة", "Governance Rules", lang)}
        actions={canManageGovernance && !editing && !is_oversight && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Edit3 className="w-4 h-4" aria-hidden="true" />
            {t("تحرير القواعد", "Edit Rules")}
          </Button>
        )}
      />

      {editing ? (
        <div className="raqeem-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("تحرير قواعد الحوكمة", "Edit Governance Rules")}</h3>
            <button onClick={() => setEditing(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="p-2 rounded-md bg-secondary/60 text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            {t("لا تؤثر التغييرات بأثر رجعي على الاجتماعات أو التصويتات المكتملة.", "Changes do not retroactively affect completed meetings or votes.")}
          </div>
          <div>
            <Label>{t("النصاب", "Quorum Count")}</Label>
            <Input aria-label={t("النصاب", "Quorum Count")} type="number" value={form.quorum_count} onChange={(e) => setForm(f => ({ ...f, quorum_count: e.target.value }))} />
          </div>
          <div>
            <Label>{t("قاعدة التصويت", "Voting Rule")}</Label>
            <select className="w-full h-9 rounded-md border border-input px-3 text-sm mt-1 bg-transparent" aria-label={t("قاعدة التصويت", "Voting Rule")} value={form.voting_rule} onChange={(e) => setForm(f => ({ ...f, voting_rule: e.target.value }))}>
              {VOTING_RULES.map((r) => <option key={r.value} value={r.value}>{t(r.label_ar, r.label_en)}</option>)}
            </select>
          </div>
          <div>
            <Label>{t("دورة الاجتماعات", "Meeting Cadence")}</Label>
            <select className="w-full h-9 rounded-md border border-input px-3 text-sm mt-1 bg-transparent" aria-label={t("دورة الاجتماعات", "Meeting Cadence")} value={form.meeting_cadence} onChange={(e) => setForm(f => ({ ...f, meeting_cadence: e.target.value }))}>
              {CADENCE.map((r) => <option key={r.value} value={r.value}>{t(r.label_ar, r.label_en)}</option>)}
            </select>
          </div>
          <div>
            <Label>{t("التصنيف", "Classification")}</Label>
            <select className="w-full h-9 rounded-md border border-input px-3 text-sm mt-1 bg-transparent" aria-label={t("التصنيف", "Classification")} value={form.classification} onChange={(e) => setForm(f => ({ ...f, classification: e.target.value }))}>
              {CLASSIFICATION.map((r) => <option key={r.value} value={r.value}>{t(r.label_ar, r.label_en)}</option>)}
            </select>
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full min-h-[44px]">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("حفظ", "Save")}
          </Button>
        </div>
      ) : (
        <div className="raqeem-card p-4 space-y-3">
          {rules.map((r, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium">{r.value || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}