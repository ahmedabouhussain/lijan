import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link2, X, Plus, Loader2, FileText } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { useLanguage } from "@/lib/LanguageContext";

const DOC_TYPES = {
  memo: { ar: "مذكرة", en: "Memo" },
  report: { ar: "تقرير", en: "Report" },
  analysis: { ar: "تحليل", en: "Analysis" },
  proposal: { ar: "مقترح", en: "Proposal" },
  evidence: { ar: "دليل", en: "Evidence" },
  correspondence: { ar: "مراسلة", en: "Correspondence" },
  draft_decision: { ar: "مسودة قرار", en: "Draft Decision" },
  establishing_decision: { ar: "قرار إنشائي", en: "Establishing Decision" },
  charter: { ar: "ميثاق", en: "Charter" },
  execution_document: { ar: "مستند تنفيذي", en: "Execution Document" },
  legal_reference: { ar: "مرجع قانوني", en: "Legal Reference" },
  other: { ar: "أخرى", en: "Other" },
};

const DOC_STATUS = {
  draft: { ar: "مسودة", en: "Draft", color: "text-muted-foreground bg-secondary" },
  in_review: { ar: "قيد المراجعة", en: "In Review", color: "text-amber-700 bg-amber-50" },
  approved: { ar: "معتمد", en: "Approved", color: "text-emerald-700 bg-emerald-50" },
  published: { ar: "منشور", en: "Published", color: "text-primary bg-primary/10" },
  superseded: { ar: "ملغى", en: "Superseded", color: "text-muted-foreground bg-secondary" },
  archived: { ar: "مؤرشف", en: "Archived", color: "text-muted-foreground bg-secondary" },
};

export default function DecisionDocuments({ decision, committee }) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [linkedDocs, setLinkedDocs] = useState([]);
  const [availableDocs, setAvailableDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");

  async function load() {
    if (!decision?.id || !decision?.committee_id) return;
    setLoading(true);
    try {
      const [linked, committeeDocs] = await Promise.all([
        base44.entities.Document.filter({ decision_id: decision.id }).catch(() => []),
        base44.entities.Document.filter({ committee_id: decision.committee_id }).catch(() => []),
      ]);
      setLinkedDocs(linked || []);
      setAvailableDocs((committeeDocs || []).filter((d) => d.id !== decision.id && (!d.decision_id || d.decision_id !== decision.id)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [decision?.id]);

  const linkDocument = async () => {
    if (!selectedDocId) return;
    setLinking(true);
    try {
      await base44.entities.Document.update(selectedDocId, { decision_id: decision.id });
      setSelectedDocId("");
      await load();
    } finally {
      setLinking(false);
    }
  };

  const unlinkDocument = async (docId) => {
    await base44.entities.Document.update(docId, { decision_id: "" });
    await load();
  };

  if (loading) {
    return (
      <div className="raqeem-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {isAr ? "جارٍ تحميل المستندات..." : "Loading documents..."}
        </div>
      </div>
    );
  }

  return (
    <div className="raqeem-card p-5">
      <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Link2 className="w-4 h-4 text-primary" />
        {isAr ? "المراجع القانونية ومستندات التنفيذ" : "Legal References & Execution Documents"}
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        {isAr
          ? "ربط المستندات بالقرار يضمن وجود مرجع قانوني واضح لكل إجراء."
          : "Linking documents to the decision ensures a clear legal reference for every action."}
      </p>

      {/* Linked documents */}
      {linkedDocs.length === 0 ? (
        <div className="text-center py-6 mb-4">
          <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isAr ? "لا توجد مستندات مرتبطة بهذا القرار بعد" : "No documents linked to this decision yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {linkedDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-md bg-secondary/30 border border-border"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {doc.title || doc.title_ar || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{DOC_TYPES[doc.document_type]?.[lang] || doc.document_type}</span>
                    <span>·</span>
                    <StatusBadge
                      label={DOC_STATUS[doc.status]?.[lang] || doc.status}
                      colorClass={DOC_STATUS[doc.status]?.color}
                    />
                    {doc.classification && doc.classification !== "internal" && (
                      <>
                        <span>·</span>
                        <span className="text-amber-600">{doc.classification}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => unlinkDocument(doc.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/5 shrink-0"
                title={isAr ? "إلغاء الربط" : "Unlink"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link new document */}
      {availableDocs.length > 0 && (
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{isAr ? "— اختر مستند للربط —" : "— Select document to link —"}</option>
            {availableDocs.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title || doc.title_ar || "—"} · {DOC_TYPES[doc.document_type]?.[lang] || doc.document_type}
              </option>
            ))}
          </select>
          <button
            onClick={linkDocument}
            disabled={!selectedDocId || linking}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
          >
            {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isAr ? "ربط" : "Link"}
          </button>
        </div>
      )}
    </div>
  );
}