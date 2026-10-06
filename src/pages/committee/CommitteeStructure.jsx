import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCommitteeScopedData } from "@/hooks/useCommitteeScoped";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import PageHeader from "@/components/raqeem/PageHeader";
import EmptyState from "@/components/raqeem/EmptyState";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import { Button } from "@/components/ui/button";
import { Network, Plus } from "lucide-react";
import { RELATIONSHIP_TYPES, REVIEW_OR_OVERTURN } from "@/lib/structureLabels";

// CommitteeStructure — the typed relationship graph of one committee.
// Each link declares WHAT it means: a parent, a subcommittee, an advisory group, a joint committee,
// and kept strictly apart the appointing body, the ratifying body, a mere reporting recipient and an
// oversight body. The card states whether the relationship conveys approval — a reporting line does not.
export default function CommitteeStructure() {
  const { records, loading, reload, committee } = useCommitteeScopedData("CommitteeRelationship", (cid) => ({
    $or: [{ committee_id: cid }, { counterparty_committee_id: cid }],
  }));
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { canManageGovernance } = useCommitteeAdmin();
  const [showCreate, setShowCreate] = useState(false);
  const [committees, setCommittees] = useState([]);

  const committeeId = data?.committee?.id || committee?.id;

  useEffect(() => {
    base44.entities.Committee.filter({}, { limit: 50, fields: ["id", "name_ar", "name_en"] })
      .then((page) => setCommittees(Array.isArray(page) ? page : page?.items || []))
      .catch(() => setCommittees([]));
  }, []);

  const OPTIONS = committees
    .filter((c) => c.id !== committeeId)
    .map((c) => ({ value: c.id, label_ar: c.name_ar || c.name_en, label_en: c.name_en || c.name_ar }));

  const TYPE_OPTIONS = Object.entries(RELATIONSHIP_TYPES).map(([value, cfg]) => ({
    value, label_ar: cfg.ar, label_en: cfg.en,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Network}
        title={t("الهيكل والعلاقات", "Structure & Relationships", lang)}
        actions={canManageGovernance && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t("علاقة جديدة", "New Relationship")}
          </Button>
        )}
      />
      <p className="text-sm text-muted-foreground -mt-2">
        {t(
          "كل علاقة مُصنَّفة: علاقة التقارير لا تمنح اعتمادًا، وعلاقة الرقابة لا تمنح اعتمادًا.",
          "Each relationship is typed: a reporting line does not convey approval, and neither does oversight.",
          lang
        )}
      </p>

      {showCreate && canManageGovernance && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("تسجيل علاقة بين لجنتين", "Record a Committee Relationship")}
          functionName="CreateCommitteeRelationship"
          payload={{ committee_id: committeeId }}
          onSuccess={reload}
          submitLabel={t("تسجيل العلاقة", "Record Relationship")}
          fields={[
            { name: "relationship_type", label: t("نوع العلاقة", "Relationship Type"), type: "select", required: true, options: TYPE_OPTIONS },
            { name: "counterparty_committee_id", label: t("اللجنة المقابلة", "Counterparty Committee"), type: "select", required: true, options: OPTIONS },
            { name: "legal_basis", label: t("السند النظامي", "Legal / Mandate Basis"), required: true, fullWidth: true },
            { name: "scope", label: t("النطاق", "Scope"), fullWidth: true },
            { name: "reserved_matters", label: t("ما تحتفظ به اللجنة الأم", "Reserved Matters"), fullWidth: true, placeholder: t("اكتب «لا شيء» إن لم تحتفظ بشيء", "Write 'none' when nothing is reserved") },
            { name: "delegated_capabilities", label: t("القدرات المفوَّضة (مفصولة بفاصلة)", "Delegated Capabilities (comma separated)"), fullWidth: true },
            { name: "delegation_expires_at", label: t("انتهاء التفويض", "Delegation Expiry"), type: "date" },
            { name: "review_or_overturn", label: t("سلطة اللجنة الأم على المخرجات", "Parent Power over Output"), type: "select", options: REVIEW_OR_OVERTURN.map((v) => ({ value: v, label_ar: v, label_en: v })) },
            { name: "reporting_obligation", label: t("التزام التقارير", "Reporting Obligation"), fullWidth: true },
            { name: "start_date", label: t("تاريخ البداية", "Start Date"), type: "date" },
            { name: "end_date", label: t("تاريخ النهاية", "End Date"), type: "date" },
          ]}
        />
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...", lang)}</div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={Network}
          title={t("لا توجد علاقات مسجّلة", "No relationships recorded", lang)}
          description={t("لم تُسجَّل علاقة مُصنَّفة لهذه اللجنة بعد.", "No typed relationship has been recorded for this committee yet.", lang)}
        />
      ) : (
        <div className="space-y-2">
          {records.map((r) => {
            const cfg = RELATIONSHIP_TYPES[r.relationship_type] || {};
            const outbound = r.committee_id === committeeId && r.direction !== "inbound";
            const counterparty = lang === "ar"
              ? (r.counterparty_name_ar || r.counterparty_name_en)
              : (r.counterparty_name_en || r.counterparty_name_ar);
            return (
              <div key={r.id} className="raqeem-card p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{lang === "ar" ? cfg.ar : cfg.en}</span>
                    <span className="text-muted-foreground">{outbound ? "→" : "←"}</span>
                    <span>{counterparty || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      {r.status === "active" ? t("نشط", "Active", lang) : r.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-state-neutral-surface text-state-neutral-ink">
                      {cfg.conveys_approval
                        ? t("يمنح اعتمادًا", "Conveys approval", lang)
                        : t("لا يمنح اعتمادًا", "No approval power", lang)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t("السند", "Basis", lang)}: {r.legal_basis || "—"}{r.basis_reference ? ` · ${r.basis_reference}` : ""}</p>
                {r.scope && <p className="text-xs text-muted-foreground">{t("النطاق", "Scope", lang)}: {r.scope}</p>}
                {Array.isArray(r.delegated_capabilities) && r.delegated_capabilities.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("القدرات المفوَّضة", "Delegated", lang)}: {r.delegated_capabilities.join(" · ")}
                    {r.reserved_matters ? ` — ${t("المحتفظ به", "Reserved", lang)}: ${r.reserved_matters}` : ""}
                    {r.delegation_expires_at ? ` — ${t("تنتهي", "expires", lang)}: ${String(r.delegation_expires_at).slice(0, 10)}` : ""}
                  </p>
                )}
                {r.ratification_required && (
                  <p className="text-xs text-state-warning-ink">{t("مخرجات هذه الجهة لا تنفذ قبل المصادقة", "This body's output is not effective until ratified", lang)}</p>
                )}
                {r.reporting_obligation && <p className="text-xs text-muted-foreground">{t("التقارير", "Reporting", lang)}: {r.reporting_obligation}</p>}
                {(r.start_date || r.end_date) && (
                  <p className="text-xs text-muted-foreground">
                    {t("السريان", "Valid", lang)}: {r.start_date || "—"} → {r.end_date || t("مفتوح", "open", lang)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}