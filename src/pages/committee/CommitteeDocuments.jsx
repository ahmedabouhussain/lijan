import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import { base44 } from "@/api/base44Client";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { FileText, Download, Plus, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/raqeemUtils";

const DOC_TYPES = [
  { value: "memo", label_ar: "مذكرة", label_en: "Memo" },
  { value: "report", label_ar: "تقرير", label_en: "Report" },
  { value: "analysis", label_ar: "تحليل", label_en: "Analysis" },
  { value: "proposal", label_ar: "مقترح", label_en: "Proposal" },
  { value: "evidence", label_ar: "دليل", label_en: "Evidence" },
  { value: "correspondence", label_ar: "مراسلة", label_en: "Correspondence" },
  { value: "draft_decision", label_ar: "مسودة قرار", label_en: "Draft Decision" },
  { value: "other", label_ar: "أخرى", label_en: "Other" },
];

const CLASSIFICATIONS = [
  { value: "public", label_ar: "عام", label_en: "Public" },
  { value: "internal", label_ar: "داخلي", label_en: "Internal" },
  { value: "confidential", label_ar: "سري", label_en: "Confidential" },
  { value: "restricted", label_ar: "مقيّد", label_en: "Restricted" },
];

export default function CommitteeDocuments() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("documents");
  const { canManageDocuments } = useCommitteeAdmin();
  const { submitting, execute } = useCrudAction();
  const [showCreate, setShowCreate] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const committeeId = data?.committee?.id;
  const orgId = data?.committee?.organization_id;

  const fetchDocs = async () => {
    if (!committeeId) return;
    try {
      const all = await base44.entities.Document.filter({ committee_id: committeeId });
      setDocs(all || []);
    } catch { setDocs([]); }
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [committeeId]);

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("وثائق اللجنة", "Committee Documents", lang)}</h1>
          <span className="text-sm text-muted-foreground">({docs.length})</span>
        </div>
        {canManageDocuments && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" />
            {t("إضافة وثيقة", "Add Document")}
          </Button>
        )}
      </div>

      {showCreate && canManageDocuments && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("إضافة وثيقة جديدة", "Add New Document")}
          functionName="CreateCommitteeRecord"
          payload={{
            entity_type: "Document",
            committee_id: committeeId,
            organization_id: orgId,
            status: "draft",
          }}
          onSuccess={fetchDocs}
          submitLabel={t("إنشاء", "Create")}
          fields={[
            { name: "title", label: t("عنوان الوثيقة", "Document Title"), required: true, fullWidth: true, placeholder: "Q3 Financial Report" },
            { name: "title_ar", label: t("العنوان بالعربية", "Title (Arabic)"), fullWidth: true, placeholder: "تقرير الميزانية" },
            { name: "document_type", label: t("النوع", "Type"), type: "select", required: true, options: DOC_TYPES },
            { name: "classification", label: t("التصنيف", "Classification"), type: "select", options: CLASSIFICATIONS },
            { name: "description", label: t("الوصف", "Description"), type: "textarea", fullWidth: true, rows: 2 },
          ]}
        />
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : docs.length === 0 ? (
        <EmptyState icon={FileText} title={t("لا توجد وثائق", "No Documents")} description={t("لم يتم إضافة وثائق لهذه اللجنة.", "No documents added for this committee.")} />
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="raqeem-card p-4 flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{d.title_ar || d.title}</div>
                <div className="text-xs text-muted-foreground">
                  {d.document_type && t(DOC_TYPES.find((t2) => t2.value === d.document_type)?.label_ar || d.document_type, d.document_type)}
                  {d.classification && ` · ${d.classification}`}
                  {d.created_date ? ` · ${formatDate(d.created_date)}` : ""}
                </div>
              </div>
              <StatusBadge label={d.status || "draft"} colorClass="bg-secondary text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}