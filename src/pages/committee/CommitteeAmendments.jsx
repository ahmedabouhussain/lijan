import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { base44 } from "@/api/base44Client";
import { GitBranch, Loader2, Plus, Check, X, AlertTriangle, Send, RotateCcw, CalendarClock, ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/raqeem/StatusBadge";
import AmendmentFormBuilder from "@/components/raqeem/AmendmentFormBuilder";

const AMENDMENT_TYPES = [
  { value: "add_member", label: "إضافة عضو" },
  { value: "end_member", label: "إنهاء عضوية" },
  { value: "change_role", label: "تغيير دور" },
  { value: "reconstitute", label: "إعادة تشكيل" },
  { value: "rename", label: "إعادة تسمية" },
  { value: "amend_mandate", label: "تعديل الصلاحية" },
  { value: "change_quorum", label: "تغيير النصاب" },
  { value: "change_voting_rule", label: "تغيير قاعدة التصويت" },
  { value: "extend_committee", label: "تمديد اللجنة" },
  { value: "renew_committee", label: "تجديد اللجنة" },
  { value: "other", label: "أخرى" },
];

const REVIEW_STAGES = [
  { key: "secretary_review", label: "مراجعة الأمين", seq: 1 },
  { key: "governance_review", label: "مراجعة الحوكمة", seq: 2 },
  { key: "legal_review", label: "المراجعة القانونية", seq: 3 },
];

const STATUS_COLORS = {
  draft: "bg-secondary text-secondary-foreground",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  effective: "bg-green-100 text-green-700",
  rejected: "bg-destructive/15 text-destructive",
  returned: "bg-orange-100 text-orange-700",
  cancelled: "bg-secondary text-muted-foreground",
  superseded: "bg-secondary text-muted-foreground",
  secretary_review: "bg-blue-100 text-blue-700",
  governance_review: "bg-indigo-100 text-indigo-700",
  legal_review: "bg-violet-100 text-violet-700",
  scheduled: "bg-cyan-100 text-cyan-700",
};

const STATUS_LABELS = {
  draft: "مسودة", pending_approval: "بانتظار الاعتماد", approved: "معتمد", effective: "نافذ",
  rejected: "مرفوض", returned: "مُرجَع", cancelled: "ملغي", superseded: "مُستبدَل",
  secretary_review: "مراجعة الأمين", governance_review: "مراجعة الحوكمة",
  legal_review: "مراجعة قانونية", scheduled: "مجدول للنفاذ",
};

export default function CommitteeAmendments() {
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
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [data?.committee?.id]);

  const propose = async () => {
    if (!form.description) { setMsg("الوصف مطلوب"); return; }
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
        setMsg(`تم إنشاء مقترح التعديل. الأثر: ${d.impact_summary}`);
        setShowForm(false);
        setForm({ amendment_type: "add_member", description: "", source_instrument_ref: "", effective_date: "", after_state: {} });
        load();
      }
    } catch (e) { setMsg(e?.message || "خطأ"); }
    setBusy("");
  };

  const approve = async (id) => {
    if (!confirm("تأكيد اعتماد هذا التعديل ونفاذه؟")) return;
    setBusy(`approve-${id}`);
    setMsg("");
    try {
      const res = await base44.functions.invoke("ApproveCommitteeAmendment", { amendment_id: id });
      const d = res.data || res;
      if (d.error) { setMsg(d.error); }
      else { setMsg(`تم اعتماد التعديل — نسخة تشكيل #${d.formation_version}`); load(); reload(); }
    } catch (e) { setMsg(e?.message || "خطأ"); }
    setBusy("");
  };

  const reject = async (id) => {
    if (!confirm("رفض هذا التعديل؟")) return;
    setBusy(`reject-${id}`);
    try {
      const res = await base44.functions.invoke("TransitionAmendmentStatus", { amendment_id: id, transition: "reject" });
      const d = res.data || res;
      if (d.error) setMsg(d.error); else load();
    } catch (e) { setMsg(e?.message || "خطأ"); }
    setBusy("");
  };

  const transition = async (id, action, extra = {}) => {
    const labels = {
      submit: "إرسال للاعتماد", submit_for_review: "إرسال للمراجعة متعددة المراحل",
      advance_review: "تجاوز مرحلة المراجعة", return: "إرجاع للتصحيح",
      schedule: "جدولة للنفاذ المستقبلي", cancel: "إلغاء",
    };
    if (action === "schedule") {
      const date = prompt("تاريخ النفاذ المستقبلي (YYYY-MM-DD):");
      if (!date) return;
      extra.effective_date = date;
    }
    setBusy(`${action}-${id}`);
    try {
      const res = await base44.functions.invoke("TransitionAmendmentStatus", { amendment_id: id, transition: action, ...extra });
      const d = res.data || res;
      if (d.error) setMsg(d.error); else { setMsg(`${labels[action]} — الحالة: ${d.new_status}`); load(); }
    } catch (e) { setMsg(e?.message || "خطأ"); }
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
      else { setMsg(`تجاوز مرحلة المراجعة — الحالة: ${d.new_status}`); load(); setReviewForm({ amendmentId: null, comments: "" }); }
    } catch (e) { setMsg(e?.message || "خطأ"); }
    setBusy("");
  };

  if (!data) return null;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("التعديلات المحوَّكة", "Governed Amendments")}</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="w-4 h-4" /> اقتراح تعديل
        </Button>
      </div>

      {msg && <div className="p-3 rounded-md bg-secondary text-sm">{msg}</div>}

      {showForm && (
        <div className="raqeem-card p-4 space-y-3">
          <Label className="text-sm font-semibold">اقتراح تعديل محوَّك</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">نوع التعديل</Label>
              <select
                value={form.amendment_type}
                onChange={(e) => setForm((f) => ({ ...f, amendment_type: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {AMENDMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">تاريخ النفاذ (اختياري — للمستقبلي)</Label>
              <Input type="date" value={form.effective_date} onChange={(e) => setForm((f) => ({ ...f, effective_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">الوصف / السبب</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <div>
            <Label className="text-xs">مرجع السند الرسمي</Label>
            <Input value={form.source_instrument_ref} onChange={(e) => setForm((f) => ({ ...f, source_instrument_ref: e.target.value }))} placeholder="رقم القرار / المرسوم" />
          </div>
          <div className="rounded-md border border-border p-3 bg-secondary/20">
            <AmendmentFormBuilder
              type={form.amendment_type}
              value={form.after_state}
              onChange={(after_state) => setForm((f) => ({ ...f, after_state }))}
            />
          </div>
          <Button size="sm" disabled={busy === "propose"} onClick={propose} className="inline-flex items-center gap-2">
            {busy === "propose" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إنشاء مقترح + تحليل الأثر
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : amendments.length === 0 ? (
        <div className="raqeem-card p-6 text-center text-sm text-muted-foreground">
          لا توجد تعديلات. كل تغيير رسمي يمر عبر سير عمل محوَّك: اقتراح → تحليل أثر → مراجعة متعددة المراحل → اعتماد → نفاذ.
        </div>
      ) : (
        <div className="space-y-2">
          {amendments.map((a) => (
            <div key={a.id} className="raqeem-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {AMENDMENT_TYPES.find((t) => t.value === a.amendment_type)?.label || a.amendment_type}
                  </div>
                  {a.description && <div className="text-xs text-muted-foreground truncate">{a.description}</div>}
                  {a.source_instrument_ref && <div className="text-xs text-muted-foreground">السند: {a.source_instrument_ref}</div>}
                  {a.effective_date && <div className="text-xs text-muted-foreground">نفاذ: {a.effective_date}</div>}
                </div>
                <StatusBadge label={STATUS_LABELS[a.status] || a.status} colorClass={STATUS_COLORS[a.status] || "bg-secondary"} />
              </div>
              {a.impact_summary && (
                <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{a.impact_summary}</span>
                </div>
              )}
              {a.proposed_by_name && (
                <div className="text-xs text-muted-foreground">اقترح: {a.proposed_by_name}</div>
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
                    {busy === `submit_for_review-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    إرسال للمراجعة متعددة المراحل
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === `submit-${a.id}`} onClick={() => transition(a.id, "submit")} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `submit-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    إرسال مباشر للاعتماد
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === `reject-${a.id}`} onClick={() => reject(a.id)} className="inline-flex items-center gap-1.5 h-7 text-xs text-destructive">
                    {busy === `reject-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    رفض
                  </Button>
                </div>
              )}
              {a.status === "returned" && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Button size="sm" variant="default" disabled={busy === `submit_for_review-${a.id}`} onClick={() => transition(a.id, "submit_for_review")} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `submit_for_review-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    إعادة إرسال للمراجعة
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === `submit-${a.id}`} onClick={() => transition(a.id, "submit")} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `submit-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    إعادة إرسال مباشر
                  </Button>
                </div>
              )}
              {a.status === "pending_approval" && (
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={busy === `approve-${a.id}`} onClick={() => approve(a.id)} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `approve-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    اعتماد ونفاذ
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === `return-${a.id}`} onClick={() => transition(a.id, "return")} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `return-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    إرجاع للتصحيح
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === `reject-${a.id}`} onClick={() => reject(a.id)} className="inline-flex items-center gap-1.5 h-7 text-xs text-destructive">
                    {busy === `reject-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    رفض
                  </Button>
                </div>
              )}
              {a.status === "approved" && a.effective_date && (
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={busy === `schedule-${a.id}`} onClick={() => transition(a.id, "schedule")} className="inline-flex items-center gap-1.5 h-7 text-xs">
                    {busy === `schedule-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarClock className="w-3.5 h-3.5" />}
                    جدولة للنفاذ المستقبلي
                  </Button>
                </div>
              )}
              {a.status === "scheduled" && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-cyan-700 inline-flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5" /> سيُنفَّذ تلقائيًا في {a.effective_date}
                  </span>
                  <Button size="sm" variant="ghost" disabled={busy === `cancel-${a.id}`} onClick={() => transition(a.id, "cancel")} className="inline-flex items-center gap-1.5 h-7 text-xs text-destructive">
                    {busy === `cancel-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    إلغاء الجدولة
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
  const currentSeq = REVIEW_STAGES.find((s) => s.key === amendment.status)?.seq;
  const isReviewStage = ["secretary_review", "governance_review", "legal_review"].includes(amendment.status);

  return (
    <div className="p-2.5 rounded-md bg-secondary/30 space-y-2.5">
      {/* Stage progress indicator */}
      <div className="flex items-center gap-1.5">
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
                {isDone || isPast ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center text-[10px]">{stage.seq}</span>}
                {stage.label}
              </div>
              {i < REVIEW_STAGES.length - 1 && <ArrowRightCircle className="w-3 h-3 text-muted-foreground rotate-180" />}
            </React.Fragment>
          );
        })}
        <ArrowRightCircle className="w-3 h-3 text-muted-foreground rotate-180" />
        <div className={`px-2 py-1 rounded text-xs ${
          amendment.status === "pending_approval" ? "bg-amber-100 text-amber-700 font-medium" : "bg-secondary text-muted-foreground"
        }`}>
          اعتماد
        </div>
      </div>

      {/* Completed stage details */}
      {stages.length > 0 && (
        <div className="space-y-1">
          {stages.filter((s) => s.status === "completed").map((s) => (
            <div key={s.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Check className="w-3 h-3 text-green-600" />
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
            placeholder="ملاحظات المراجعة (اختياري)..."
            value={reviewForm.amendmentId === amendment.id ? reviewForm.comments : ""}
            onChange={(e) => setReviewForm({ amendmentId: amendment.id, comments: e.target.value })}
            className="h-7 text-xs"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="default" disabled={busy === `advance_review-${amendment.id}`} onClick={onAdvance} className="inline-flex items-center gap-1.5 h-7 text-xs">
              {busy === `advance_review-${amendment.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              تجاوز هذه المرحلة
            </Button>
            <Button size="sm" variant="ghost" disabled={busy === `return-${amendment.id}`} onClick={onReturn} className="inline-flex items-center gap-1.5 h-7 text-xs">
              {busy === `return-${amendment.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              إرجاع للتصحيح
            </Button>
            <Button size="sm" variant="ghost" disabled={busy === `reject-${amendment.id}`} onClick={onReject} className="inline-flex items-center gap-1.5 h-7 text-xs text-destructive">
              {busy === `reject-${amendment.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              رفض
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}