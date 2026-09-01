import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { PenLine } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { formatDate } from "@/lib/raqeemUtils";

const INTENT = {
  approve: { ar: "اعتماد", en: "Approve", color: "bg-emerald-100 text-emerald-700" },
  acknowledge: { ar: "إقرار", en: "Acknowledge", color: "bg-blue-100 text-blue-700" },
  attest: { ar: "شهادة", en: "Attest", color: "bg-purple-100 text-purple-700" },
  witness: { ar: "مشاهدة", en: "Witness", color: "bg-secondary text-muted-foreground" },
};

export default function CommitteeSignatures() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data?.committee?.id) return;
    base44.entities.Signature.filter({ committee_id: data.committee.id })
      .then((res) => setRecords(res || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [data?.committee?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PenLine className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("التواقيع", "Signatures")}</h1>
      </div>
      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={PenLine} title={t("لا توجد تواقيع", "No Signatures")} description={t("لم يتم تسجيل تواقيع لهذه اللجنة.", "No signatures recorded for this committee.")} />
      ) : (
        <div className="space-y-2">
          {records.map((s) => {
            const ii = INTENT[s.intent] || INTENT.approve;
            return (
              <div key={s.id} className="raqeem-card p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.document_title || s.document_type}</div>
                  <div className="text-xs text-muted-foreground">{s.signer_name} · {formatDate(s.signed_at)}</div>
                </div>
                <StatusBadge label={t(ii.ar, ii.en)} colorClass={ii.color} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}