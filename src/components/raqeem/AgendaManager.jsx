import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, X, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { AGENDA_ITEM_STATUS, READINESS, CLASSIFICATION } from "@/lib/raqeemUtils";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";

export default function AgendaManager({ meetingId, items = [], onChanged }) {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    objective: "",
    presenter: "",
    time_allocation_minutes: 15,
    required_decision: "",
    classification: "internal",
    readiness: "not_ready",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const seq = (items?.length || 0) + 1;
      await base44.entities.AgendaItem.create({
        ...form,
        meeting_id: meetingId,
        sequence: seq,
        status: "pending",
      });
      await base44.entities.AuditLog.create({
        action: "create",
        entity_type: "AgendaItem",
        entity_title: form.title,
        description: L.pair("إضافة بند جدول أعمال", "Agenda item added"),
      });
      setForm({ title: "", objective: "", presenter: "", time_allocation_minutes: 15, required_decision: "", classification: "internal", readiness: "not_ready" });
      setShow(false);
      onChanged();
    } catch {}
    setSaving(false);
  };

  const changeStatus = async (itemId, status) => {
    try {
      await base44.entities.AgendaItem.update(itemId, { status });
      await base44.entities.AuditLog.create({
        action: "status_change",
        entity_type: "AgendaItem",
        entity_id: itemId,
        new_value: status,
        description: `${L.pair("تغيير حالة بند الجدول إلى", "Agenda item status changed to")} ${L.label(AGENDA_ITEM_STATUS, status, status)}`,
      });
      onChanged();
    } catch {}
  };

  const updateReadiness = async (itemId, readiness) => {
    try {
      await base44.entities.AgendaItem.update(itemId, { readiness });
      await base44.entities.AuditLog.create({
        action: "update",
        entity_type: "AgendaItem",
        entity_id: itemId,
        new_value: readiness,
        description: `${L.pair("تحديث جاهزية البند إلى", "Item readiness updated to")} ${L.label(READINESS, readiness, readiness)}`,
      });
      onChanged();
    } catch {}
  };

  const remove = async (itemId) => {
    try {
      await base44.entities.AgendaItem.delete(itemId);
      onChanged();
    } catch {}
  };

  const sorted = [...items].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  const selectClass = "w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-3">
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
          <div className="grid grid-cols-3 gap-3">
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
            <div>
              <Label className="text-xs">{t("الجاهزية", "Readiness")}</Label>
              <select value={form.readiness} onChange={(e) => update("readiness", e.target.value)} className={selectClass}>
                {Object.entries(READINESS).map(([k, v]) => (
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
          {sorted.map((item) => (
            <div key={item.id} className="border border-border rounded-md p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">{item.sequence}.</span>
                    <span className="text-sm font-medium text-foreground">{L.title(item)}</span>
                  </div>
                  {item.objective && <p className="text-xs text-muted-foreground mt-1">{t(item.objective_ar, item.objective)}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                    {item.presenter && <span>{t("المقدم", "Presenter")}: {item.presenter}</span>}
                    {item.time_allocation_minutes && <span>{item.time_allocation_minutes} {t("دقيقة", "min")}</span>}
                    {item.readiness && <StatusBadge label={L.label(READINESS, item.readiness, item.readiness)} colorClass={READINESS[item.readiness]?.color} />}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge label={L.label(AGENDA_ITEM_STATUS, item.status, item.status)} colorClass={AGENDA_ITEM_STATUS[item.status]?.color} />
                  <button onClick={() => remove(item.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Evidence Readiness Gate */}
              {item.status === "in_discussion" && item.readiness !== "ready" && (
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[10px] text-amber-800 font-medium">
                      {t("بوابة الجاهزية مغلقة — البند غير جاهز للقرار. حدّث الجاهزية إلى «جاهز» لفتح البوابة.", "Readiness gate closed — this item is not ready for decision. Set readiness to Ready to open the gate.")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">{t("تحديث الجاهزية:", "Update readiness:")}</span>
                    {Object.entries(READINESS).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => updateReadiness(item.id, k)}
                        className={`text-[10px] px-2 py-1 rounded border ${item.readiness === k ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-secondary"}`}
                      >
                        {t(v.ar, v.en)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {item.status !== "decided" && item.status !== "withdrawn" && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border flex-wrap">
                  {item.status === "pending" && (
                    <button onClick={() => changeStatus(item.id, "in_discussion")} className="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
                      {t("بدء المناقشة", "Start discussion")}
                    </button>
                  )}
                  {item.status === "in_discussion" && (
                    <>
                      <button
                        onClick={() => changeStatus(item.id, "decided")}
                        disabled={item.readiness !== "ready"}
                        className={`text-[10px] px-2 py-1 rounded inline-flex items-center gap-1 ${
                          item.readiness === "ready"
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-secondary text-muted-foreground/50 cursor-not-allowed"
                        }`}
                      >
                        {item.readiness === "ready" ? <ShieldCheck className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {t("تم القرار", "Decided")}
                      </button>
                      <button onClick={() => changeStatus(item.id, "deferred")} className="text-[10px] px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100">
                        {t("تأجيل", "Defer")}
                      </button>
                    </>
                  )}
                  <button onClick={() => changeStatus(item.id, "withdrawn")} className="text-[10px] px-2 py-1 rounded bg-red-50 text-destructive hover:bg-red-100">
                    {t("سحب", "Withdraw")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}