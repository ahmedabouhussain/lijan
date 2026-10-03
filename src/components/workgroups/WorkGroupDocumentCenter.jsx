// LIJAN™ — WorkGroupDocumentCenter.
//
// The work group does NOT own a separate store: this is the COMMITTEE document centre with a
// work-group scope filter applied. One library, one permission model, one audit trail.
//
// Files are stored privately — no public URL, so access follows the app's permissions and every
// preview or download is served through a short-lived signed link.

import React, { useState, useEffect } from "react";
import { FileText, Download, Eye, Archive, Loader2, Sparkles, History, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { useAmeenSafe } from "@/lib/AmeenContext";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/raqeem/StatusBadge";
import LocalizedFileUpload from "@/components/raqeem/LocalizedFileUpload";
import { L } from "@/lib/l10n";

export default function WorkGroupDocumentCenter({
  committeeId,
  organizationId,
  workGroupCode,
  documents = [],
  canEdit = false,
  canDownload = false,
  onChanged,
}) {
  const { t, lang } = useLanguage();
  const ameen = useAmeenSafe();
  const isAr = lang === "ar";

  const [versions, setVersions] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const docIds = documents.map((d) => d.id).join(",");

  useEffect(() => {
    if (!docIds) { setVersions([]); return; }
    let cancelled = false;
    base44.entities.DocumentVersion
      .filter({ document_id: { $in: docIds.split(",") } }, { sort: "-version_number", limit: 200 })
      .then((page) => { if (!cancelled) setVersions(page?.items || []); })
      .catch(() => { if (!cancelled) setVersions([]); });
    return () => { cancelled = true; };
  }, [docIds]);

  const versionsOf = (docId) => versions.filter((v) => v.document_id === docId);
  const currentOf = (docId) => versionsOf(docId).find((v) => v.status === "current") || versionsOf(docId)[0] || null;

  const openFile = async (version, mode) => {
    if (!version?.file_url || !canDownload) return;
    setBusy(version.id);
    setError("");
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: version.file_url });
      if (mode === "download") {
        const a = document.createElement("a");
        a.href = signed_url;
        a.download = version.file_name || "document";
        a.click();
      } else {
        window.open(signed_url, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setError(t("تعذّر فتح الملف المطلوب.", "The requested file could not be opened."));
    }
    setBusy(null);
  };

  // New file → private upload → a governed document version. Both steps are the committee's
  // existing paths, so the work group inherits their versioning and audit behaviour.
  const uploadNew = async (file) => {
    setError("");
    setBusy("upload");
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const doc = await base44.entities.Document.create({
        organization_id: organizationId,
        committee_id: committeeId,
        title: file.name,
        title_ar: file.name,
        document_type: "other",
        classification: "internal",
        status: "draft",
        tags: workGroupCode || null,
      });
      const res = await base44.functions.invoke("UploadDocumentVersion", {
        committee_id: committeeId,
        document_id: doc.id,
        file_url: file_uri,
        file_name: file.name,
        file_size_bytes: file.size,
        change_summary: t("إصدار أول من مركز وثائق مجموعة العمل", "First version from the work group document centre"),
      });
      if (res.data?.error) throw new Error(res.data.error);
      setShowUpload(false);
      onChanged?.();
    } catch (e) {
      setError(
        e?.response?.data?.error ||
        e?.message ||
        t("تعذّر رفع المستند — تحقق من صلاحيتك في هذه اللجنة.", "The document could not be uploaded — check your authority in this committee.")
      );
    }
    setBusy(null);
  };

  const archive = async (doc) => {
    setBusy(doc.id);
    setError("");
    try {
      await base44.entities.Document.update(doc.id, { status: "archived" });
      onChanged?.();
    } catch {
      setError(t("تعذّر أرشفة الوثيقة.", "The document could not be archived."));
    }
    setBusy(null);
  };

  const askAmeen = (doc) => {
    if (!ameen?.askAmeen) return;
    const title = isAr ? doc.title_ar || doc.title : doc.title;
    ameen.askAmeen(
      isAr
        ? `لخّص الوثيقة «${title}» واستخرج القرارات والإجراءات الواردة فيها، مع ذكر المستند والإصدار والصفحة.`
        : `Summarise the document "${title}" and extract the decisions and actions it contains, citing the document, version and page.`
    );
  };

  return (
    <section className="raqeem-card p-4" aria-label={t("مركز وثائق مجموعة العمل", "Work group document centre")}>
      <header className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          {t("مركز الوثائق", "Document centre")}
          <span className="text-xs text-muted-foreground arabic-figures">({documents.length})</span>
        </h2>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setShowUpload((v) => !v)}>
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            {t("رفع مستند", "Upload document")}
          </Button>
        )}
      </header>

      <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
        {t(
          "هذا مركز وثائق اللجنة نفسه بمرشّح نطاق مجموعة العمل. الملفات مخزّنة بشكل خاص — لا رابط عام، والوصول يتبع صلاحيات التطبيق.",
          "This is the committee document centre filtered to the work group's scope. Files are stored privately — no public URL, and access follows the app's permissions."
        )}
      </p>

      {showUpload && canEdit && (
        <div className="mb-3">
          <LocalizedFileUpload onUpload={uploadNew} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg" />
          {busy === "upload" && (
            <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              {t("جارٍ الرفع…", "Uploading…")}
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-3 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-2.5 py-2">
          {error}
        </p>
      )}

      {documents.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("لا توجد وثائق مرتبطة بهذه المجموعة بعد.", "No documents linked to this work group yet.")}
        </p>
      ) : (
        <ul className="divide-y divide-border -mx-4">
          {documents.map((doc) => {
            const current = currentOf(doc.id);
            const count = versionsOf(doc.id).length;
            const archived = doc.status === "archived";
            return (
              <li key={doc.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {isAr ? doc.title_ar || doc.title : doc.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      {current?.file_name && <span className="truncate max-w-[16rem]">{current.file_name}</span>}
                      {count > 0 && (
                        <span className="inline-flex items-center gap-1 arabic-figures">
                          <History className="w-3 h-3" aria-hidden="true" />
                          {t(`الإصدار ${current?.version_number || count}`, `Version ${current?.version_number || count}`)}
                        </span>
                      )}
                      {doc.created_date && <span className="arabic-figures">{L.date(doc.created_date)}</span>}
                    </div>
                  </div>
                  <StatusBadge
                    label={archived ? t("مؤرشفة", "Archived") : t("حالية", "Current")}
                    colorClass={archived ? "bg-secondary text-muted-foreground" : "text-emerald-700 bg-emerald-50"}
                  />
                </div>

                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {current && canDownload && (
                    <>
                      <button
                        type="button"
                        onClick={() => openFile(current, "preview")}
                        disabled={busy === current.id}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-secondary/50 disabled:opacity-50"
                      >
                        {busy === current.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" aria-hidden="true" />}
                        {t("معاينة", "Preview")}
                      </button>
                      <button
                        type="button"
                        onClick={() => openFile(current, "download")}
                        disabled={busy === current.id}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-secondary/50 disabled:opacity-50"
                      >
                        <Download className="w-3 h-3" aria-hidden="true" />
                        {t("تنزيل", "Download")}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => askAmeen(doc)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-primary/5 hover:border-primary/40"
                  >
                    <Sparkles className="w-3 h-3 text-primary" aria-hidden="true" />
                    {t("استخلاص بواسطة أمين", "Extract with AMEEN")}
                  </button>
                  {canEdit && !archived && (
                    <button
                      type="button"
                      onClick={() => archive(doc)}
                      disabled={busy === doc.id}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-secondary/50 disabled:opacity-50"
                    >
                      <Archive className="w-3 h-3" aria-hidden="true" />
                      {t("أرشفة", "Archive")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}