import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import useCommitteeRegister from "@/hooks/useCommitteeRegister";
import { Link, useParams } from "react-router-dom";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import StatusBadge from "@/components/raqeem/StatusBadge";
import RegisterStatePanel from "@/components/raqeem/RegisterStatePanel";
import { FileText, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/raqeemUtils";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { L } from "@/lib/l10n";

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
  const { data } = useCommittee();
  const { orgRef, committeeRef } = useParams();
  const { t, lang } = useLanguage();
  const { getTitle } = usePageConfig("documents");
  const { canManageDocuments } = useCommitteeAdmin();
  const [showCreate, setShowCreate] = useState(false);

  // The register is listed by the SERVER, in the same scope as a document's own page, so a listed
  // document always opens. Listing it here would show only what this visitor's own row-level
  // rules happened to allow — which is not the committee's register.
  // The state of the register — loading, empty, no authority, out of scope, unavailable — travels
  // with the same read, so a refusal can never be rendered as a count of zero.
  const { items, countFor, state, reload } = useCommitteeRegister("documents");

  const committeeId = data?.committee?.id;
  const orgId = data?.committee?.organization_id;
  const docs = items("documents");
  const total = countFor("documents") ?? docs.length;
  const base = `/o/${orgRef}/c/${committeeRef}`;

  if (!data) return <TableSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FileText}
        title={getTitle("وثائق اللجنة", "Committee Documents", lang)}
        badge={<span className="text-sm text-muted-foreground">({total})</span>}
        actions={canManageDocuments && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t("إضافة وثيقة", "Add Document")}
          </Button>
        )}
      />

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
          onSuccess={reload}
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

      {state ? (
        <RegisterStatePanel
          state={state}
          onRetry={reload}
          icon={FileText}
          emptyTitle={t("لا توجد وثائق", "No Documents")}
          emptyDescription={t("قُرِئ سجل وثائق اللجنة بنجاح، ولا يحتوي على أي وثيقة في نطاقك الحالي.", "The committee's document register was read successfully and holds no document in your current scope.")}
        />
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <Link key={d.id} to={`${base}/documents/${d.id}`} className="raqeem-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{L.title(d)}</div>
                <div className="text-xs text-muted-foreground">
                  {d.document_type && t(DOC_TYPES.find((t2) => t2.value === d.document_type)?.label_ar || d.document_type, d.document_type)}
                  {d.classification && ` · ${t(CLASSIFICATIONS.find((c) => c.value === d.classification)?.label_ar || d.classification, CLASSIFICATIONS.find((c) => c.value === d.classification)?.label_en || d.classification)}`}
                  {d.created_date ? ` · ${formatDate(d.created_date)}` : ""}
                </div>
              </div>
              <StatusBadge label={d.status || "draft"} colorClass="bg-secondary text-muted-foreground" />
              <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180 shrink-0" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}