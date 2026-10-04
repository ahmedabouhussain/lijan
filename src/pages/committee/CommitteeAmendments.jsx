import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommittee } from "@/lib/CommitteeContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { base44 } from "@/api/base44Client";
import { GitBranch, Loader2, Plus, Check, X, AlertTriangle, Send, RotateCcw, CalendarClock, ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/raqeem/StatusBadge";
import AmendmentFormBuilder from "@/components/raqeem/AmendmentFormBuilder";
import LocalizedDatePicker from "@/components/raqeem/LocalizedDatePicker";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";

const AMENDMENT_TYPES = [
  { value: "add_member", ar: "إضافة عضو", en: "Add member" },
  { value: "end_member", ar: "إنهاء عضوية", en: "End membership" },
  { value: "change_role", ar: "تغيير دور", en: "Change role" },
  { value: "reconstitute", ar: "إعادة تشكيل", en: "Reconstitute" },
  { value: "rename", ar: "إعادة تسمية", en: "Rename" },
  { value: "amend_mandate", ar: "تعديل الصلاحية", en: "Amend mandate" },
  { value: "change_quorum", ar: "تغيير النصاب", en: "Change quorum" },
  { value: "change_voting_rule", ar: "تغيير قاعدة التصويت", en: "Change voting rule" },
  { value: "extend_committee", ar: "تمديد اللجنة", en: "Extend committee" },
  { value: "renew_committee", ar: "تجديد اللجنة", en: "Renew committee" },
  { value: "other", ar: "أخرى", en: "Other" },
];

const REVIEW_STAGES = [
  { key: "secretary_review", ar: "مراجعة الأمين", en: "Secretary review", seq: 1 },
  { key: "governance_review", ar: "مراجعة الحوكمة", en: "Governance review", seq: 2 },
  { key: "legal_review", ar: "المراجعة القانونية", en: "Legal review", seq: 3 },
];

const STATUS_COLORS = {
  draft: "bg-secondary text-secondary-foreground",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-state-progress-surface text-state-progress-ink",
  effective: "bg-green-100 text-green-700",
  rejected: "bg-destructive/15 text-destructive",
  returned: "bg-orange-100 text-orange-700",
  cancelled: "bg-secondary text-muted-foreground",
  superseded: "bg-secondary text-muted-foreground",
  secretary_review: "bg-state-info-surface text-state-info-ink",
  governance_review: "bg-state-info-surface text-state-info-ink",
  legal_review: "bg-state-info-surface text-state-info-ink",
  scheduled: "bg-state-progress-surface text-state-progress-ink",
};

const STATUS_LABELS = {
  draft: ["مسودة", "Draft"],
  pending_approval: ["بانتظار الاعتماد", "Pending approval"],
  approved: ["معتمد", "Approved"],
  effective: ["نافذ", "Effective"],
  rejected: ["مرفوض", "Rejected"],
  returned: ["مُرجَع للتصحيح", "Returned for correction"],
  cancelled: ["ملغي", "Cancelled"],
  superseded: ["مُستبدَل", "Superseded"],
  secretary_review: ["مراجعة الأمين", "Secretary review"],
  governance_review: ["مراجعة الحوكمة", "Governance review"],
  legal_review: ["مراجعة قانونية", "Legal review"],
  scheduled: ["مجدول للنفاذ", "Scheduled to take effect"],
};

export default function CommitteeAmendments() {
  const { t } = useLanguage();
  const { data, reload } = useCommittee();
  const { getTitle } = usePageConfig("amendments");
  const [amendments, setAmendments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [reviewStages, setReviewStages] = useState({});
  const [reviewForm, setReviewForm] = useState({ amendmentId: null, comments: "" });

  const urlParams = new URLSearchParams(window.location.search);
  const presetType = urlParams.get("type");

  const typeLabel = (v) => {
    const found = AMENDMENT_TYPES.find((x) => x.value === v);
    return found ? t(found.ar, found.en) : v;
  };
  const statusLabel = (s) => {
    const pair = STATUS_LABELS[s];
    return pair ? t(pair[0], pair[1]) : s;
  };

  const [form, setForm] = useState({
    amendment_type: presetType || "add_member",
    description: "",
    source_instrument_ref: "",
    effective_date: "",
    after_state: {},
  });

  useEffect(() => {
    if (presetType) setShowForm(true);
  }, []);

  const load = async () => {
    if (!data?.committee) return;
    setLoading(true);
    try {
      const res = await base44.entities.CommitteeAmendment.filter({
        committee_id: data.committee.id,
      }, "-created_date", 50);
      setAmendments(res || []);
      // Fetch review stages for amendments in review
      const inReview = (res || []).filter((a) =>
        ["secretary_review", "governance_review", "legal_review", "pending_approval", "effective"].includes(a.status)
      );
      if (inReview.length > 0) {
        const stages = await base44.entities.AmendmentReviewStage.filter({
          committee_id: data.committee.id,
        }, "sequence_order", 100).catch(() => []);
        const byAmendment = {};
        (stages || []).forEach((s) => {
          if (!byAmendment[s.amendment_id]) byAmendment[s.amendment_id] = [];
          byAmendment[s.amendment_id].push(s);
        });
        setReviewStages(byAmendment);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [data?.committee?.id]);

  const propose = async () => {
    if (!form.description) { setMsg(t("الوصف مطلوب", "A description is required")); return; }
    setBusy("propose");
    setMsg("");
    try {
      const afterState = form.after_state || {};
      const res = await base44.functions.invoke("ProposeCommitteeAmendment", {
        committee_id: data.committee.id,
        amendment_type: form.amendment_type,
        description: form.description,
        source_instrument_ref: form.source_instrument_ref,
        effective_date: form.effective_date,
        after_state: afterState,
      });
      const d = res.data || res;
      if (d.error) { setMsg(d.error); }
      else {
        setMsg(`${t("تم إنشاء مقترح التعديل. الأثر:", "The amendment proposal was created. Impact:")} ${d.impact_summary}`);
        setShowForm(false);
        setForm({ amendment_type: "add_member", description: "", source_instrument_ref: "", effective_date: "", after_state: {} });
        load();
      }
    } catch (e) { setMsg(e?.message || t("خطأ", "Error")); }
    setBusy("");
  };

  const approve = async (id) => {
    if (!confirm(t("تأكيد اعتماد هذا التعديل ونفاذه؟", "Approve this amendment and make it effective?"))) return;
    setBusy(`approve-${id}`);
    setMsg("");
    try {
      const res = await base44.functions.invoke("ApproveCommitteeAmendment", { amendment_id: id });
      const d = res.data || res;
      if (d.error) { setMsg(d.error); }
      else {
        setMsg(`${t("تم اعتماد التعديل — نسخة تشكيل", "Amendment approved — formation version")} #${d.formation_version}`);
        load(); reload();
      }
    } catch (e) { setMsg(e?.message || t("خطأ", "Error")); }
    setBusy("");
  };

  const reject = async (id) => {
    if (!confirm(t("رفض هذا التعديل؟", "Reject this amendment?"))) return;
    setBusy(`reject-${id}`);
    try {
      const res = await base44.functions.invoke("TransitionAmendmentStatus", { amendment_id: id, transition: "reject" });
      const d = res.data || res;
      if (d.error) setMsg(d.error); else load();
    } catch (e) { setMsg(e?.message || t("خطأ", "Error")); }
    setBusy("");
  };

  const transition = async (id, action, extra = {}) => {
    const labels = {
      submit: t("إرسال للاعتماد", "Submitted for approval"),
      submit_for_review: t("إرسال للمراجعة متعددة المراحل", "Sent for multi-stage review"),
      advance_review: t("تجاوز مرحلة المراجعة", "Advanced past the review stage"),
      return: t("إرجاع للتصحيح", "Returned for correction"),
      schedule: t("جدولة للنفاذ المستقبلي", "Scheduled for future effect"),
      cancel: t("إلغاء", "Cancelled"),
    };
    if (action === "schedule") {
      const date = prompt(t("تاريخ النفاذ المستقبلي (YYYY-MM-DD):", "Future effective date (YYYY-MM-DD):"));
      if (!date) return;
      extra.effective_date = date;
    }
    setBusy(`${action}-${id}`);
    try {
      const res = await base44.functions.invoke("TransitionAmendmentStatus", { amendment_id: id, transition: action, ...extra });
      const d = res.data || res;
      if (d.error) setMsg(d.error);
      else {
        setMsg(`${labels[action]} — ${t("الحالة", "Status")}: ${statusLabel(d.new_status)}`);
        load();
      }
    } catch (e) { setMsg(e?.message || t("خطأ", "Error")); }
    setBusy("");
  };

  const advanceReview = async (id) => {
    const comments = reviewForm.amendmentId === id ? reviewForm.comments : "";
    setBusy(`advance_review-${id}`);
    try {
      const res = await base44.functions.invoke("TransitionAmendmentStatus", {
        amendment_id: id, transition: "advance_review", review_notes: comments,
      });
      const d = res.data || res;
      if (d.error) setMsg(d.error);
      else {
        setMsg(`${t("تجاوز مرحلة المراجعة — الحالة:", "Advanced past the review stage — status:")} ${statusLabel(d.new_status)}`);
        load();
        setReviewForm({ amendmentId: null, comments: "" });
      }
    } catch (e) { setMsg(e?.message || t("خطأ", "Error")); }
    setBusy("");
  };

  if (!data) return <TableSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={GitBranch}
        title={getTitle("التعديلات المحوَّكة", "Governed Amendments")}
        actions={
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="w-4 h-4" aria-hidden="true" /> {t("اقتراح تعديل", "Propose amendment")}
          </Button>
        }
      />

      {msg && <div className="p-3 rounded-md bg-secondary text-sm" role="status">{msg}</div>}

      {showForm && (
        <div className="raqeem-card p-4 space-y-3">
          <Label className="text-sm font-semibold">{t("اقتراح تعديل محوَّك", "Propose a governed amendment")}</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs" htmlFor="amendment-type">{t("نوع التعديل", "Amendment type")}</Label>
              <select
                id="amendment-type"
                value={form.amendment_type}
                onChange={(e) => setForm((f) => ({ ...f, amendment_type: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {AMENDMENT_TYPES.map((x) => <option key={x.value} value={x.value}>{t(x.ar, x.en)}</option>)}
              </select>
            </div>
            <div>
              <LocalizedDatePicker
                label={t("تاريخ النفاذ (اختياري — للمستقبلي)", "Effective date (optional — for future effect)")}
                value={form.effective_date}
                onChange={(v) => setForm((f) => ({ ...f, effective_date: v }))}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs" htmlFor="amendment-description">{t("الوصف / السبب", "Description / reason")}</Label>
            <Textarea
              id="amendment-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs" htmlFor="amendment-reference">{t("مرجع السند الرسمي", "Official instrument reference")}</Label>
            <Input
              id="amendment-reference"
              value={form.source_instrument_ref}
              onChange={(e) => setForm((f) => ({ ...f, source_instrument_ref: e.target.value }))}
              placeholder={t("رقم القرار / المرسوم", "Decision / decree number")}
            />
          </div>
          <div className="rounded-md border border-border p-3 bg-secondary/20">
            <AmendmentFormBuilder
              type={form.amendment_type}
              value={form.after_state}
              onChange={(after_state) => setForm((f) => ({ ...f, after_state }))}
            />
          </div>
          <Button size="sm" disabled={busy === "propose"} onClick={propose} className="inline-flex items-center gap-2">
            {busy === "propose" ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
            {t("إنشاء مقترح + تحليل الأثر", "Create proposal + impact analysis")}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8" role="status" aria-live="polite">
          <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">{t("جارٍ التحميل", "Loading")}</span>
        </div>
      ) : amendments.length === 0 ? (
        <div className="raqeem-card p-6 text-center text-sm text-muted-foreground">
          {t(
            "لا توجد تعديلات. كل تغيير رسمي يمر عبر سير عمل محوَّك: اقتراح → تحليل أثر → مراجعة متعددة المراحل → اعتماد → نفاذ.",
            "No amendments. Every formal change follows a governed path: proposal → impact analysis → multi-stage review → approval → effect."
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {amendments.map((a) => (
            <div key={a.id} className="raqeem-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{typeLabel(a.amendment_type)}</div>
                  {a.description && <div className="text-xs text-muted-foreground truncate">{a.description}</div>}
                  {a.source_instrument_ref && (
                    <div className="text-xs text-muted-foreground">{t("السند:", "Instrument:")} {a.source_instrument_ref}</div>
                  )}
                  {a.effective_date && (
                    <div className="text-xs text-muted-foreground">{t("نفاذ:", "Effective:")} {a.effective_date}</div>
                  )}
                </div>
                <StatusBadge label={statusLabel(a.status)} colorClass={STATUS_COLORS[a.status] || "bg-secondary"} />
              </div>
              {a.impact_summary && (
                <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{a.impact_summary}</span>
                </div>
              )}
              {a.proposed_by_name && (
                <div className="text-xs text-muted-foreground">{t("اقترح:", "Proposed by:")} {a.proposed_by_name}</div>
              )}

              {/* Review chain progress for amendments in review */}
              {["secretary_review", "governance_review", "legal_review", "pending_approval"].includes(a.status) && (
                <ReviewChain
                  amendment={a}
                  stages={reviewStages[a.id] || []}
                  reviewForm={reviewForm}
                  setReviewForm={setReviewForm}
                  onAdvance={() => advanceReview(a.id)}
                  onReturn={() => transition(a.id, "return")}
                  onReject={() => reject(a.id)}
                  busy={busy}
                />
              )}

              {a.status === "draft" && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Button size="sm" variant="default" disabled={busy === `submit_for_review-${a.id}`} onClick={() => transition(a.id, "submit_for_review")} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `submit_for_review-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />}
                    {t("إرسال للمراجعة متعددة المراحل", "Send for multi-stage review")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === `submit-${a.id}`} onClick={() => transition(a.id, "submit")} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `submit-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />}
                    {t("إرسال مباشر للاعتماد", "Send directly for approval")}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === `reject-${a.id}`} onClick={() => reject(a.id)} className="inline-flex items-center gap-1.5 h-7 text-xs text-destructive">
                    {busy === `reject-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <X className="w-3.5 h-3.5" aria-hidden="true" />}
                    {t("رفض", "Reject")}
                  </Button>
                </div>
              )}
              {a.status === "returned" && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Button size="sm" variant="default" disabled={busy === `submit_for_review-${a.id}`} onClick={() => transition(a.id, "submit_for_review")} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `submit_for_review-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />}
                    {t("إعادة إرسال للمراجعة", "Resend for review")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === `submit-${a.id}`} onClick={() => transition(a.id, "submit")} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `submit-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />}
                    {t("إعادة إرسال مباشر", "Resend directly")}
                  </Button>
                </div>
              )}
              {a.status === "pending_approval" && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Button size="sm" variant="outline" disabled={busy === `approve-${a.id}`} onClick={() => approve(a.id)} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `approve-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                    {t("اعتماد ونفاذ", "Approve and make effective")}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === `return-${a.id}`} onClick={() => transition(a.id, "return")} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `return-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                    {t("إرجاع للتصحيح", "Return for correction")}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === `reject-${a.id}`} onClick={() => reject(a.id)} className="inline-flex items-center gap-1.5 h-7 text-xs text-destructive">
                    {busy === `reject-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <X className="w-3.5 h-3.5" aria-hidden="true" />}
                    {t("رفض", "Reject")}
                  </Button>
                </div>
              )}
              {a.status === "approved" && a.effective_date && (
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={busy === `schedule-${a.id}`} onClick={() => transition(a.id, "schedule")} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `schedule-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />}
                    {t("جدولة للنفاذ المستقبلي", "Schedule for future effect")}
                  </Button>
                </div>
              )}
              {a.status === "scheduled" && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-xs text-state-progress-ink inline-flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                    {t("سيُنفَّذ تلقائيًا في", "Takes effect automatically on")} {a.effective_date}
                  </span>
                  <Button size="sm" variant="ghost" disabled={busy === `cancel-${a.id}`} onClick={() => transition(a.id, "cancel")} className="inline-flex items-center gap-1.5 h-7 text-xs text-destructive">
                    {busy === `cancel-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <X className="w-3.5 h-3.5" aria-hidden="true" />}
                    {t("إلغاء الجدولة", "Cancel the schedule")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewChain({ amendment, stages, reviewForm, setReviewForm, onAdvance, onReturn, onReject, busy }) {
  const { t } = useLanguage();
  const currentSeq = REVIEW_STAGES.find((s) => s.key === amendment.status)?.seq;
  const isReviewStage = ["secretary_review", "governance_review", "legal_review"].includes(amendment.status);

  return (
    <div className="p-2.5 rounded-md bg-secondary/30 space-y-2.5">
      {/* Stage progress indicator */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {REVIEW_STAGES.map((stage, i) => {
          const stageRecord = stages.find((s) => s.stage === stage.key);
          const isDone = stageRecord && stageRecord.status === "completed";
          const isCurrent = amendment.status === stage.key;
          const isPast = currentSeq && stage.seq < currentSeq;
          return (
            <React.Fragment key={stage.key}>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                isCurrent ? "bg-primary text-primary-foreground font-medium" :
                isDone || isPast ? "bg-green-100 text-green-700" :
                "bg-secondary text-muted-foreground"
              }`}>
                {isDone || isPast ? <Check className="w-3 h-3" aria-hidden="true" /> : <span className="w-3 h-3 flex items-center justify-center text-[10px]">{stage.seq}</span>}
                {t(stage.ar, stage.en)}
              </div>
              {i < REVIEW_STAGES.length - 1 && <ArrowRightCircle className="w-3 h-3 text-muted-foreground rotate-180" aria-hidden="true" />}
            </React.Fragment>
          );
        })}
        <ArrowRightCircle className="w-3 h-3 text-muted-foreground rotate-180" aria-hidden="true" />
        <div className={`px-2 py-1 rounded text-xs ${
          amendment.status === "pending_approval" ? "bg-amber-100 text-amber-700 font-medium" : "bg-secondary text-muted-foreground"
        }`}>
          {t("اعتماد", "Approval")}
        </div>
      </div>

      {/* Completed stage details */}
      {stages.length > 0 && (
        <div className="space-y-1">
          {stages.filter((s) => s.status === "completed").map((s) => (
            <div key={s.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Check className="w-3 h-3 text-green-600" aria-hidden="true" />
              <span className="font-medium">{s.stage_label}</span>
              <span>— {s.reviewer_name}</span>
              {s.comments && <span className="truncate">· {s.comments}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Advance review form */}
      {isReviewStage && (
        <div className="space-y-2 pt-1">
          <Input
            aria-label={t("ملاحظات المراجعة", "Review notes")}
            placeholder={t("ملاحظات المراجعة (اختياري)...", "Review notes (optional)...")}
            value={reviewForm.amendmentId === amendment.id ? reviewForm.comments : ""}
            onChange={(e) => setReviewForm({ amendmentId: amendment.id, comments: e.target.value })}
            className="h-7 text-xs"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="default" disabled={busy === `advance_review-${amendment.id}`} onClick={onAdvance} className="inline-flex items-center gap-1.5 h-7 text-xs">
              {busy === `advance_review-${amendment.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
              {t("تجاوز هذه المرحلة", "Advance past this stage")}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy === `return-${amendment.id}`} onClick={onReturn} className="inline-flex items-center gap-1.5 h-7 text-xs">
              {busy === `return-${amendment.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
              {t("إرجاع للتصحيح", "Return for correction")}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy === `reject-${amendment.id}`} onClick={onReject} className="inline-flex items-center gap-1.5 h-7 text-xs text-destructive">
              {busy === `reject-${amendment.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <X className="w-3.5 h-3.5" aria-hidden="true" />}
              {t("رفض", "Reject")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}