import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Archive, X, Lock, AlertTriangle, Play, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { AGENDA_ITEM_STATUS, READINESS, CLASSIFICATION } from "@/lib/raqeemUtils";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";

export default function AgendaManager({ meetingId, committeeId, items = [], onChanged }) {
  const { t, lang } = useLanguage();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  // A refusal from a governed command is REPORTED with the server's own reason, never swallowed.
  const [actionError, setActionError] = useState(null);
  const reportRefusal = (e, fallbackAr, fallbackEn) => {
    const serverMsg = e?.data?.error || e?.response?.data?.error || e?.message;
    setActionError({ ar: serverMsg || fallbackAr, en: serverMsg || fallbackEn });
  };
  const [form, setForm] = useState({
    title: "",
    objective: "",
    presenter: "",
    time_allocation_minutes: 15,
    required_decision: "",
    classification: "internal",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setActionError(null);
    try {
      // Submitted through the GOVERNED command: it derives the committee from the meeting itself,
      // assigns the sequence and writes the server audit event. Readiness is not chosen here — it is
      // computed from the item's evidence requirements by the governed evaluation.
      const { presenter, ...rest } = form;
      const res = await base44.functions.invoke("SubmitAgendaItem", {
        committee_id: committeeId,
        meeting_id: meetingId,
        ...rest,
        [lang === "ar" ? "presenter_ar" : "presenter_en"]: presenter,
      });
      if (res?.data?.error) { reportRefusal({ data: res.data }, "تعذّر إضافة البند.", "The item could not be submitted."); setSaving(false); return; }
      setForm({ title: "", objective: "", presenter: "", time_allocation_minutes: 15, required_decision: "", classification: "internal" });
      setShow(false);
      onChanged();
    } catch (e) {
      reportRefusal(e, "تعذّر إضافة البند: الصلاحية غير كافية أو الخدمة غير متاحة.", "The item could not be submitted: authority insufficient or service unavailable.");
    }
    setSaving(false);
  };

  // (The former `changeStatus` stub lived here: it declared the stage change unavailable because no
  // governed command existed. The command exists now — TransitionAgendaItem — so the stub is gone
  // rather than leaving a message that would tell the reader something untrue about the platform.)

  // Readiness is COMPUTED from the item's evidence requirements — the surface asks for the
  // evaluation instead of asserting the value itself.
  const evaluateReadiness = async (itemId) => {
    setActionError(null);
    try {
      const res = await base44.functions.invoke("EvaluateAgendaReadiness", { agenda_item_id: itemId });
      if (res?.data?.error) { reportRefusal({ data: res.data }, "تعذّر تقييم جاهزية البند.", "Item readiness could not be evaluated."); return; }
      onChanged();
    } catch (e) {
      reportRefusal(e, "تعذّر تقييم جاهزية البند: الصلاحية غير كافية.", "Item readiness could not be evaluated: insufficient authority.");
    }
  };

  // Taking an item off the agenda is a GOVERNED act, not a delete (D-024): a governance record that
  // can be deleted cannot be audited, so the item is withdrawn through the command and its record is
  // kept on the file with the actor and the correlation id.
  const archiveItem = async (itemId) => {
    setActionError(null);
    try {
      const res = await base44.functions.invoke("ArchiveAgendaItem", { agenda_item_id: itemId });
      if (res?.data?.error) { reportRefusal({ data: res.data }, "تعذّر سحب البند.", "The item could not be withdrawn."); return; }
      onChanged();
    } catch (e) {
      reportRefusal(e, "تعذّر سحب البند.", "The item could not be withdrawn.");
    }
  };

  // Stage changes run through the governed command (D-022). The right follows the ACT — preparing the
  // agenda is not approving it — and when a right is missing the SERVER's own refusal is displayed
  // instead of a silent no-op.
  const advanceItem = async (itemId, transition) => {
    setActionError(null);
    try {
      const res = await base44.functions.invoke("TransitionAgendaItem", { agenda_item_id: itemId, transition });
      if (res?.data?.error) { reportRefusal({ data: res.data }, "تعذّر نقل مرحلة البند.", "The item stage could not be changed."); return; }
      onChanged();
    } catch (e) {
      reportRefusal(e, "تعذّر نقل مرحلة البند.", "The item stage could not be changed.");
    }
  };

  const sorted = [...items].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  const selectClass = "w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="rounded-md border border-state-danger-ink/30 bg-state-danger-surface p-2.5 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-state-danger-ink shrink-0 mt-0.5" />
          <p className="text-[11px] text-state-danger-ink">{t(actionError.ar, actionError.en)}</p>
        </div>
      )}
      {!show ? (
        <button onClick={() => setShow(true)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <Plus className="w-3.5 h-3.5" /> {t("إضافة بند جدول أعمال", "Add agenda item")}
        </button>
      ) : (
        <div className="border border-border rounded-md p-4 space-y-3 relative">
          <button onClick={() => setShow(false)} className="absolute top-3 left-3 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
          <div>
            <Label className="text-xs">{t("عنوان البند *", "Item title *")}</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder={t("بند جدول الأعمال", "Agenda item")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t("الهدف", "Objective")}</Label>
              <Input value={form.objective} onChange={(e) => update("objective", e.target.value)} placeholder={t("هدف البند", "Item objective")} />
            </div>
            <div>
              <Label className="text-xs">{t("المقدم", "Presenter")}</Label>
              <Input value={form.presenter} onChange={(e) => update("presenter", e.target.value)} placeholder={t("اسم المقدم", "Presenter name")} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t("المدة (دقيقة)", "Duration (min)")}</Label>
              <Input type="number" value={form.time_allocation_minutes} onChange={(e) => update("time_allocation_minutes", parseInt(e.target.value) || 15)} />
            </div>
            <div>
              <Label className="text-xs">{t("التصنيف", "Classification")}</Label>
              <select value={form.classification} onChange={(e) => update("classification", e.target.value)} className={selectClass}>
                {Object.entries(CLASSIFICATION).map(([k, v]) => (
                  <option key={k} value={k}>{t(v.ar, v.en)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">{t("القرار المطلوب", "Required decision")}</Label>
            <Input value={form.required_decision} onChange={(e) => update("required_decision", e.target.value)} placeholder={t("ما القرار المطلوب من هذا البند؟", "What decision is required on this item?")} />
          </div>
          <Button size="sm" onClick={create} disabled={saving || !form.title.trim()}>
            {saving ? t("جارٍ الحفظ...", "Saving...") : t("إضافة البند", "Add item")}
          </Button>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((item) => {
            const presenter = L.value(item, { arKey: "presenter_ar", enKey: "presenter_en", legacyKey: "presenter" });
            return (
            <div key={item.id} className="border border-border rounded-md p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">{item.sequence}.</span>
                    <span className="text-sm font-medium text-foreground">{L.title(item)}</span>
                  </div>
                  {item.objective && <p className="text-xs text-muted-foreground mt-1">{t(item.objective_ar, item.objective)}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                    {presenter && <span>{t("المقدم", "Presenter")}: {presenter}</span>}
                    {item.time_allocation_minutes && <span>{item.time_allocation_minutes} {t("دقيقة", "min")}</span>}
                    {item.readiness && <StatusBadge label={L.label(READINESS, item.readiness, item.readiness)} colorClass={READINESS[item.readiness]?.color} />}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge label={L.label(AGENDA_ITEM_STATUS, item.status, item.status)} colorClass={AGENDA_ITEM_STATUS[item.status]?.color} />
                  {item.status !== "withdrawn" && (
                    <button onClick={() => archiveItem(item.id)} title={t("سحب البند من الأجندة — لا حذف", "Withdraw the item from the agenda — never a deletion")} className="text-muted-foreground hover:text-primary">
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {/* Evidence Readiness Gate */}
              {item.status === "in_discussion" && item.readiness !== "ready" && (
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[10px] text-amber-800 font-medium">
                      {t("بوابة الجاهزية مغلقة — البند غير جاهز للقرار. تُفتح البوابة عندما تُحسب الجاهزية «جاهز» من متطلبات الأدلة.", "Readiness gate closed — this item is not ready for decision. The gate opens when the readiness evaluation computes 'Ready' from the evidence requirements.")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">
                      {t("الجاهزية محسوبة من متطلبات الأدلة، لا مُختارة يدويًا.", "Readiness is computed from the evidence requirements, never asserted by hand.")}
                    </span>
                    <button onClick={() => evaluateReadiness(item.id)} className="text-[10px] px-2 py-1 rounded border border-primary text-primary hover:bg-primary/5">
                      {t("تقييم الجاهزية", "Evaluate readiness")}
                    </button>
                  </div>
                </div>
              )}

              {item.status !== "decided" && item.status !== "withdrawn" && (
                <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5 flex-wrap">
                  {item.status === "pending" && (
                    <button onClick={() => advanceItem(item.id, "begin_discussion")} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border hover:bg-secondary">
                      <Play className="w-3 h-3" /> {t("بدء المناقشة", "Start discussion")}
                    </button>
                  )}
                  <button onClick={() => advanceItem(item.id, "decide")} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-primary text-primary hover:bg-primary/5">
                    <CheckCircle2 className="w-3 h-3" /> {t("تم القرار", "Decided")}
                  </button>
                  {item.status !== "deferred" && (
                    <button onClick={() => advanceItem(item.id, "defer")} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border hover:bg-secondary">
                      <Clock className="w-3 h-3" /> {t("تأجيل", "Defer")}
                    </button>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {t(
                      "كل انتقال محكوم بالحق الذي يناسبه: التحضير لا يعتمد، والاعتماد لا يحضّر، وإغلاق البند «تم القرار» يتطلب جاهزية محسوبة من متطلبات الأدلة. والرفض يُعرض بنص الخادم.",
                      "Each transition runs under the right that fits the act: preparing does not approve, approving does not prepare, and closing an item as Decided requires a readiness computed from the evidence requirements. A refusal is shown with the server's own reason.",
                    )}
                  </span>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}