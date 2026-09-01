import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { base44 } from "@/api/base44Client";
import { GitBranch } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

const DEP_TYPE = {
  requires: { ar: "يتطلب", en: "Requires" },
  blocks: { ar: "يعيق", en: "Blocks" },
  informs: { ar: "يُبلغ", en: "Informs" },
  supersedes: { ar: "يحل محل", en: "Supersedes" },
  aligns_with: { ar: "متوافق مع", en: "Aligns With" },
};

const DEP_STATUS = {
  pending: { ar: "معلق", en: "Pending", color: "bg-amber-100 text-amber-700" },
  active: { ar: "نشط", en: "Active", color: "bg-blue-100 text-blue-700" },
  resolved: { ar: "محلول", en: "Resolved", color: "bg-emerald-100 text-emerald-700" },
  broken: { ar: "مكسور", en: "Broken", color: "bg-red-100 text-red-700" },
};

export default function CommitteeDependencies() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("dependencies");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data?.committee?.id) return;
    const cid = data.committee.id;
    base44.entities.CrossEntityDependency.list()
      .then((all) => {
        const filtered = (all || []).filter((d) => d.source_committee_id === cid || d.target_committee_id === cid);
        setRecords(filtered);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [data?.committee?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GitBranch className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("التبعيات", "Dependencies", lang)}</h1>
      </div>
      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={GitBranch} title={t("لا توجد تبعيات", "No Dependencies")} description={t("لم يتم تسجيل تبعيات لهذه اللجنة.", "No dependencies recorded for this committee.")} />
      ) : (
        <div className="space-y-2">
          {records.map((d) => {
            const ti = DEP_TYPE[d.dependency_type] || DEP_TYPE.requires;
            const si = DEP_STATUS[d.status] || DEP_STATUS.pending;
            return (
              <div key={d.id} className="raqeem-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm">
                    <span className="font-medium">{d.source_title}</span>
                    <span className="text-muted-foreground mx-2">—{t(ti.ar, ti.en)}→</span>
                    <span className="font-medium">{d.target_title}</span>
                  </div>
                  <StatusBadge label={t(si.ar, si.en)} colorClass={si.color} />
                </div>
                {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}