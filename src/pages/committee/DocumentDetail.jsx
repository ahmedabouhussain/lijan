import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronRight, FileText, Download, Eye, History, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/raqeem/StatusBadge";
import LocalizedField from "@/components/raqeem/LocalizedField";
import ExplorationNotice from "@/components/raqeem/ExplorationNotice";
import { useLanguage } from "@/lib/LanguageContext";
import useCommitteeRecord from "@/hooks/useCommitteeRecord";
import { formatDate, DOCUMENT_STATUS, CLASSIFICATION } from "@/lib/raqeemUtils";
import { L } from "@/lib/l10n";

// DocumentDetail — ONE document, opened from wherever it was listed: the review task, the
// documents register, a decision or a meeting. It shows the record's own metadata, its stored
// versions with governed file access, and the review trail, and it offers a response only to a
// seat that holds an open review request for THIS document.

const VERDICTS = [
  { value: "approved", ar: "أوصي بالاعتماد", en: "Recommend approval" },
  { value: "approved_with_comments", ar: "أوصي بالاعتماد مع ملاحظات", en: "Recommend approval with comments" },
  { value: "return_for_revision", ar: "طلب تعديل", en: "Request revision" },
  { value: "rejected", ar: "رفض المشروع", en: "Reject the draft" },
];

const VERDICT_LABEL = {
  approved: ["أوصى بالاعتماد", "Recommended approval"],
  approved_with_comments: ["أوصى بالاعتماد مع ملاحظات", "Recommended approval with comments"],
  return_for_revision: ["طلب تعديل", "Requested revision"],
  rejected: ["رفض المشروع", "Rejected the draft"],
};

export default function DocumentDetail() {
  const { t } = useLanguage();
  const { orgRef, committeeRef, documentId } = useParams();
  const { bundle, loading, error, reload } = useCommitteeRecord("Document", documentId);
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [comments, setComments] = useState("");
  const [verdict, setVerdict] = useState("approved_with_comments");

  const document = bundle?.record || null;
  const committee = bundle?.committee || null;
  const versions = bundle?.versions || [];
  const requests = bundle?.review_requests || [];
  const responses = bundle?.review_responses || [];
  const isExploration = bundle?.is_demo_mode === true;
  const actorId = bundle?.actor?.id || null;
  const base = `/o/${orgRef}/c/${committeeRef}`;

  // An open request this seat may answer: addressed to it by identity, or to its role.
  const myRequest = isExploration
    ? null
    : requests.find((r) => r.status === "pending" && r.reviewer_user_id === actorId);

  const openFile = async (version, action) => {
    setBusy(`${version.id}:${action}`);
    setActionError("");
    try {
      // The governed gate decides, audits the decision, and mints a short-lived link.
      const res = await base44.functions.invoke("RequestFileAccess", {
        entity_type: "DocumentVersion",
        entity_id: version.id,
        action,
        purpose: "مراجعة مستند اللجنة",
      });
      const url = (res?.data || res)?.signed_url;
      if (!url) throw new Error("no_link");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setActionError(e?.response?.data?.error || t("تعذّر الوصول إلى الملف، ولم يُمنح أي رابط.", "The file could not be accessed and no link was issued."));
    }
    setBusy("");
  };

  const submitResponse = async () => {
    if (!myRequest) return;
    setBusy("respond");
    setActionError("");
    try {
      await base44.functions.invoke("RespondToReview", {
        review_request_id: myRequest.id,
        verdict,
        comments,
      });
      setComments("");
      reload();
    } catch (e) {
      setActionError(e?.response?.data?.error || t("تعذّر تسجيل المراجعة، ولم يُحفظ أي أثر.", "The review could not be recorded and nothing was saved."));
    }
    setBusy("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!document) {
    const reason = /member of this committee/i.test(error || "")
      ? t("لا توجد عضوية مسندة إلى هذا الحساب في هذه اللجنة.", "No membership is assigned to this account in this committee.")
      : error
      ? t("تعذّر فتح هذا المستند في نطاقك الحالي.", "This document could not be opened in your current scope.")
      : t("قد يكون هذا المستند قد حُذف، أو أن الرابط الذي فتحته قديم.", "This document may have been deleted, or the link you opened is out of date.");
    return (
      <div className="raqeem-card p-8 text-center max-w-lg mx-auto my-10">
        <h2 className="text-lg font-semibold text-foreground mb-1">{t("المستند غير متوفر", "Document not available")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{reason}</p>
        <Link to={`${base}/documents`} className="text-primary hover:underline text-sm font-medium">
          {t("العودة إلى مستودع وثائق اللجنة", "Back to the committee document repository")}
        </Link>
      </div>
    );
  }

  const currentVersionNumber = document.current_version_number || (versions[0]?.version_number) || 1;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        {committee && <Link to={base} className="hover:text-foreground"><LocalizedField entity="Committee" record={committee} /></Link>}
        {committee && <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />}
        <Link to={`${base}/documents`} className="hover:text-foreground">{t("مستودع الوثائق", "Document repository")}</Link>
        <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
        <span className="text-foreground truncate"><LocalizedField entity="Document" record={document} base="title" /></span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground"><LocalizedField entity="Document" record={document} base="title" /></h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge
              label={t(DOCUMENT_STATUS[document.status]?.ar || document.status, DOCUMENT_STATUS[document.status]?.en || document.status)}
              colorClass={DOCUMENT_STATUS[document.status]?.color}
            />
            <span className="text-xs text-muted-foreground">
              {t(CLASSIFICATION[document.classification]?.ar || document.classification, CLASSIFICATION[document.classification]?.en || document.classification)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("الإصدار", "Version")} {currentVersionNumber}
            </span>
          </div>
        </div>
      </div>

      {isExploration && <ExplorationNotice />}

      {actionError && (
        <div className="raqeem-card p-3 border-destructive/30 bg-state-danger-surface">
          <p className="text-xs text-state-danger-ink">{actionError}</p>
        </div>
      )}

      {/* The record's own facts — never invented, never a client-side view */}
      <div className="raqeem-card p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> {t("بيانات المستند", "Document record")}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            [t("النوع", "Type"), document.document_type || "—"],
            [t("الجهة المُعدّة", "Prepared by"), document.owner_name_en || document.owner_name || "—"],
            [t("الجهة المالكة", "Owning entity"), committee ? L.name(committee) : "—"],
            [t("تاريخ الإنشاء", "Created"), formatDate(document.created_date)],
            [t("آخر تحديث", "Last updated"), formatDate(document.updated_date)],
            [t("حالة المراجعة", "Review state"), t(DOCUMENT_STATUS[document.status]?.ar || document.status, DOCUMENT_STATUS[document.status]?.en || document.status)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start gap-2">
              <dt className="text-muted-foreground shrink-0 w-32">{label}</dt>
              <dd className="text-foreground min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Versions — a version with no stored file says so instead of offering a dead download */}
      <div className="raqeem-card p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-primary" /> {t("الإصدارات", "Versions")}
        </h2>
        {versions.length === 0 ? (
          <div className="flex items-start gap-2 p-3 rounded-md bg-state-warning-surface">
            <AlertTriangle className="w-4 h-4 text-state-warning-ink shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-state-warning-ink">
              {t(
                "لا يوجد إصدار محفوظ لهذا المستند بعد. لا تتوفر معاينة أو تنزيل قبل حفظ ملف فعلي.",
                "No stored version exists for this document yet. Preview and download become available once a file is actually saved."
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((v) => {
              const hasFile = !!(v.file_url || v.storage_key);
              return (
                <div key={v.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {t(`الإصدار ${v.version_number}`, `Version ${v.version_number}`)}
                      {v.id === document.current_version_id && (
                        <span className="ms-2 text-[11px] text-muted-foreground">{t("الحالي", "current")}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[v.uploaded_by_name, formatDate(v.created_date), v.file_name].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {v.change_summary && <div className="text-xs text-muted-foreground mt-0.5">{v.change_summary}</div>}
                  </div>
                  {hasFile && !isExploration ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openFile(v, "preview")} disabled={busy === `${v.id}:preview`}>
                        {busy === `${v.id}:preview` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                        {t("معاينة", "Preview")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openFile(v, "download")} disabled={busy === `${v.id}:download`}>
                        {busy === `${v.id}:download` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {t("تنزيل", "Download")}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {hasFile ? t("الوصول يتطلب جلسة موثّقة", "Access requires an authenticated seat") : t("لا يوجد ملف محفوظ", "No stored file")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review trail — requests and the verdicts recorded against them */}
      <div className="raqeem-card p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" /> {t("سجل المراجعة", "Review trail")}
        </h2>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("لا توجد طلبات مراجعة على هذا المستند.", "No review requests exist for this document.")}
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const mine = responses.filter((resp) => resp.review_request_id === r.id);
              return (
                <div key={r.id} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm text-foreground">
                      {r.requested_by_name || "—"} → {r.reviewer_name || t("المراجع", "reviewer")}
                    </div>
                    <StatusBadge
                      label={r.status === "pending" ? t("قيد المراجعة", "Pending") : t("تم الرد", "Answered")}
                      colorClass={r.status === "pending" ? "bg-state-warning-surface text-state-warning-ink" : "bg-state-success-surface text-state-success-ink"}
                    />
                  </div>
                  {r.review_note && <p className="text-xs text-muted-foreground mt-1.5">{r.review_note}</p>}
                  {mine.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {mine.map((resp) => (
                        <div key={resp.id} className="text-xs text-muted-foreground">
                          <span className="text-foreground">{t(...(VERDICT_LABEL[resp.verdict] || [resp.verdict, resp.verdict]))}</span>
                          {resp.comments ? ` — ${resp.comments}` : ""}
                          {resp.created_date ? ` · ${formatDate(resp.created_date)}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Answering a request is offered only to the seat it was addressed to, and only outside
            exploration — where nothing can be attributed to a seat. */}
        {myRequest && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <p className="text-xs font-medium text-foreground">{t("مراجعتك على هذا المستند", "Your review of this document")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VERDICTS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVerdict(v.value)}
                  className={`text-start text-xs px-3 py-2 rounded-md border transition-colors ${
                    verdict === v.value ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(v.ar, v.en)}
                </button>
              ))}
            </div>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder={t("ملاحظاتك، واقتراحاتك، وما ترى تعديله", "Your comments, recommendations, and what you see needing revision")}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" onClick={submitResponse} disabled={busy === "respond"}>
              {busy === "respond" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {t("تسجيل المراجعة", "Record review")}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              {t(
                "تسجيل المراجعة يوثّق رأيك في هذا المستند. اعتماد المستند وإصداره يبقيان من صلاحية رئيس اللجنة.",
                "Recording your review documents your position on this document. Issuing and approving it remain the chair's authority."
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}