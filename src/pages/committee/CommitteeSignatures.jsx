import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import { PenLine, Plus } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/raqeemUtils";

const INTENT = {
  approve: { ar: "اعتماد", en: "Approve", color: "bg-emerald-50 text-emerald-700" },
  acknowledge: { ar: "إقرار", en: "Acknowledge", color: "bg-secondary text-muted-foreground" },
  attest: { ar: "شهادة", en: "Attest", color: "bg-secondary text-muted-foreground" },
  witness: { ar: "مشاهدة", en: "Witness", color: "bg-secondary text-muted-foreground" },
};

const INTENT_OPTIONS = [
  { value: "approve", label_ar: "اعتماد", label_en: "Approve" },
  { value: "acknowledge", label_ar: "إقرار", label_en: "Acknowledge" },
  { value: "attest", label_ar: "شهادة", label_en: "Attest" },
  { value: "witness", label_ar: "مشاهدة", label_en: "Witness" },
];

export default function CommitteeSignatures() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("signatures");
  const { canManageMinutes } = useCommitteeAdmin();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const committeeId = data?.committee?.id;
  const orgId = data?.committee?.organization_id;
  const members = data?.members || [];
  const SIGNER_OPTIONS = members.map((m) => ({ value: m.full_name, label_ar: m.full_name, label_en: m.full_name }));

  const fetchRecords = async () => {
    if (!committeeId) return;
    try {
      const res = await base44.entities.Signature.filter({ committee_id: committeeId });
      setRecords(res || []);
    } catch { setRecords([]); }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [committeeId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenLine className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("التواقيع", "Signatures", lang)}</h1>
          <span className="text-sm text-muted-foreground">({records.length})</span>
        </div>
        {canManageMinutes && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" />
            {t("طلب توقيع", "Request Signature")}
          </Button>
        )}
      </div>

      {showCreate && canManageMinutes && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("طلب توقيع جديد", "New Signature Request")}
          functionName="SignRecord"
          payload={{ committee_id: committeeId, organization_id: orgId }}
          onSuccess={fetchRecords}
          submitLabel={t("إرسال الطلب", "Send Request")}
          fields={[
            { name: "document_title", label: t("عنوان الوثيقة", "Document Title"), required: true, fullWidth: true },
            { name: "document_type", label: t("نوع الوثيقة", "Document Type"), placeholder: "Minutes / Decision" },
            { name: "signer_name", label: t("الموقّع", "Signer"), type: "select", required: true, options: SIGNER_OPTIONS },
            { name: "intent", label: t("النية", "Intent"), type: "select", options: INTENT_OPTIONS },
          ]}
        />
      )}

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