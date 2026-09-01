import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { ACTION_STATUS, PRIORITY, ESCALATION_LEVEL, formatDate, isOverdue, daysUntil } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { Save, TrendingUp, AlertTriangle, Clock, ShieldCheck, Bell, FileCheck } from "lucide-react";

const STATUS_OPTIONS = Object.entries(ACTION_STATUS).map(([k, v]) => ({ value: k, ar: v.ar }));
const PRIORITY_OPTIONS = Object.entries(PRIORITY).map(([k, v]) => ({ value: k, ar: v.ar }));
const ESCALATION_OPTIONS = Object.entries(ESCALATION_LEVEL).map(([k, v]) => ({ value: k, ar: v.ar }));

function Section({ icon: Icon, title, children }) {
  return (
    <div className="raqeem-card p-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </h4>
      {children}
    </div>
  );
}

export default function ActionManager({ action, open, onOpenChange, onUpdate }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [extReason, setExtReason] = useState("");
  const [extDeadline, setExtDeadline] = useState("");
  const [complianceNotes, setComplianceNotes] = useState("");

  React.useEffect(() => {
    if (action) {
      setForm({
        title: action.title || "",
        owner_name: action.owner_name || "",
        responsible_department: action.responsible_department || "",
        contributors: action.contributors || "",
        deadline: action.deadline || "",
        priority: action.priority || "medium",
        progress_percent: action.progress_percent || 0,
        status: action.status || "assigned",
        blocker: action.blocker || "",
        evidence_url: action.evidence_url || "",
        escalation_level: action.escalation_level || "none",
        compliance_verified: action.compliance_verified || false,
      });
      setExtReason(action.extension_reason || "");
      setExtDeadline(action.extension_new_deadline || "");
      setComplianceNotes(action.compliance_notes || "");
    }
  }, [action]);

  if (!action || !form) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveDetails = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Action.update(action.id, {
        title: form.title,
        owner_name: form.owner_name,
        responsible_department: form.responsible_department,
        contributors: form.contributors,
        deadline: form.deadline,
        priority: form.priority,
      });
      await base44.entities.AuditLog.create({
        action: "update",
        entity_type: "Action",
        entity_id: action.id,
        entity_title: action.title,
        description: "تعديل تفاصيل الإجراء",
        actor_name: form.owner_name,
      });
      onUpdate?.(updated);
    } catch {}
    setSaving(false);
  };

  const saveProgress = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Action.update(action.id, {
        progress_percent: Number(form.progress_percent),
        status: form.status,
        blocker: form.blocker,
      });
      await base44.entities.AuditLog.create({
        action: "status_change",
        entity_type: "Action",
        entity_id: action.id,
        entity_title: action.title,
        description: `تحديث المتابعة: ${form.progress_percent}% — ${ACTION_STATUS[form.status]?.ar}`,
        old_value: `${action.progress_percent}% / ${ACTION_STATUS[action.status]?.ar}`,
        new_value: `${form.progress_percent}% / ${ACTION_STATUS[form.status]?.ar}`,
      });
      onUpdate?.(updated);
    } catch {}
    setSaving(false);
  };

  const escalate = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Action.update(action.id, { escalation_level: form.escalation_level });
      await base44.entities.AuditLog.create({
        action: "escalate",
        entity_type: "Action",
        entity_id: action.id,
        entity_title: action.title,
        description: `تصعيد إلى مستوى: ${ESCALATION_LEVEL[form.escalation_level]?.ar}`,
        new_value: form.escalation_level,
      });
      onUpdate?.(updated);
    } catch {}
    setSaving(false);
  };

  const requestExtension = async () => {
    if (!extReason.trim() || !extDeadline) return;
    setSaving(true);
    try {
      const updated = await base44.entities.Action.update(action.id, {
        extension_status: "requested",
        extension_reason: extReason.trim(),
        extension_new_deadline: extDeadline,
      });
      await base44.entities.AuditLog.create({
        action: "update",
        entity_type: "Action",
        entity_id: action.id,
        entity_title: action.title,
        description: `طلب تمديد حتى ${formatDate(extDeadline)}`,
      });
      onUpdate?.(updated);
    } catch {}
    setSaving(false);
  };

  const reviewExtension = async (decision) => {
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const patch = {
        extension_status: decision,
        extension_reviewed_by: me?.full_name || "",
      };
      if (decision === "approved") patch.deadline = action.extension_new_deadline;
      const updated = await base44.entities.Action.update(action.id, patch);
      await base44.entities.AuditLog.create({
        action: decision === "approved" ? "approve" : "reject",
        entity_type: "Action",
        entity_id: action.id,
        entity_title: action.title,
        description: decision === "approved" ? `اعتماد التمديد حتى ${formatDate(action.extension_new_deadline)}` : "رفض طلب التمديد",
      });
      onUpdate?.(updated);
    } catch {}
    setSaving(false);
  };

  const sendReminder = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const overdue = isOverdue(action.deadline) && action.status !== "closed" && action.status !== "verified";
      const nextLevel = overdue ? "priority_reminder" : "reminder";
      const updated = await base44.entities.Action.update(action.id, {
        last_reminder_at: now,
        reminder_count: (action.reminder_count || 0) + 1,
        escalation_level: nextLevel,
      });
      await base44.entities.AuditLog.create({
        action: "escalate",
        entity_type: "Action",
        entity_id: action.id,
        entity_title: action.title,
        description: `إرسال تذكير (${(action.reminder_count || 0) + 1})${overdue ? " — متأخر" : ""}`,
      });
      onUpdate?.(updated);
    } catch {}
    setSaving(false);
  };

  const saveCompliance = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Action.update(action.id, {
        evidence_url: form.evidence_url,
        compliance_verified: form.compliance_verified,
        compliance_notes: complianceNotes,
        status: form.compliance_verified ? "verified" : action.status,
      });
      await base44.entities.AuditLog.create({
        action: form.compliance_verified ? "verify" : "update",
        entity_type: "Action",
        entity_id: action.id,
        entity_title: action.title,
        description: form.compliance_verified ? "اعتماد الالتزام والأدلة" : "تحديث سجل الالتزام",
      });
      onUpdate?.(updated);
    } catch {}
    setSaving(false);
  };

  const days = daysUntil(action.deadline);
  const overdueFlag = days !== null && days < 0 && action.status !== "closed" && action.status !== "verified";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-base text-right">إدارة الإجراء · Action Management</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <StatusBadge label={ACTION_STATUS[action.status]?.ar || action.status} colorClass={ACTION_STATUS[action.status]?.color} />
            {overdueFlag && <StatusBadge label={`متأخر ${Math.abs(days)} يوم`} colorClass="text-destructive bg-red-50" />}
            {action.extension_status === "requested" && <StatusBadge label="طلب تمديد معلّق" colorClass="text-amber-700 bg-amber-50" />}
            {action.extension_status === "approved" && <StatusBadge label="تمديد معتمد" colorClass="text-emerald-700 bg-emerald-50" />}
            {action.compliance_verified && <StatusBadge label="التزام معتمد" colorClass="text-emerald-700 bg-emerald-50" />}
          </div>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {/* التعديل */}
          <Section icon={Save} title="التعديل · Modify Details">
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5">عنوان الإجراء</Label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">المسؤول</Label>
                  <Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5">الإدارة</Label>
                  <Input value={form.responsible_department} onChange={(e) => set("responsible_department", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="mb-1.5">المساهمون</Label>
                <Input value={form.contributors} onChange={(e) => set("contributors", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">الموعد النهائي</Label>
                  <Input type="date" value={form.deadline || ""} onChange={(e) => set("deadline", e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5">الأولوية</Label>
                  <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-card text-sm">
                    {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.ar}</option>)}
                  </select>
                </div>
              </div>
              <Button size="sm" onClick={saveDetails} disabled={saving} className="w-full">حفظ التعديلات</Button>
            </div>
          </Section>

          {/* المتابعة */}
          <Section icon={TrendingUp} title="المتابعة · Progress & Status">
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5">نسبة التقدم: {form.progress_percent}%</Label>
                <input type="range" min={0} max={100} value={form.progress_percent} onChange={(e) => set("progress_percent", e.target.value)} className="w-full accent-primary" />
              </div>
              <div>
                <Label className="mb-1.5">الحالة</Label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-card text-sm">
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.ar}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-1.5">العوائق</Label>
                <Textarea rows={2} value={form.blocker} onChange={(e) => set("blocker", e.target.value)} placeholder="وصف أي عوائق تعترض التنفيذ…" />
              </div>
              <Button size="sm" onClick={saveProgress} disabled={saving} className="w-full">حفظ المتابعة</Button>
            </div>
          </Section>

          {/* التصعيد */}
          <Section icon={AlertTriangle} title="التصعيد · Escalation">
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5">مستوى التصعيد الحالي: {ESCALATION_LEVEL[action.escalation_level]?.ar || "بدون"}</Label>
                <select value={form.escalation_level} onChange={(e) => set("escalation_level", e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-card text-sm">
                  {ESCALATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.ar}</option>)}
                </select>
              </div>
              <Button size="sm" variant="outline" onClick={escalate} disabled={saving} className="w-full">تطبيق التصعيد</Button>
            </div>
          </Section>

          {/* التذكير */}
          <Section icon={Bell} title="التذكير · Reminders">
            <div className="text-xs text-muted-foreground space-y-1 mb-3">
              <div>عدد التذكيرات المرسلة: {action.reminder_count || 0}</div>
              {action.last_reminder_at && <div>آخر تذكير: {formatDate(action.last_reminder_at)}</div>}
            </div>
            <Button size="sm" variant="outline" onClick={sendReminder} disabled={saving} className="w-full">
              <Bell className="w-3.5 h-3.5" /> إرسال تذكير وتسجيله
            </Button>
          </Section>

          {/* طلب التمديد */}
          <Section icon={Clock} title="طلب تمديد · Extension Request">
            {action.extension_status === "requested" ? (
              <div className="space-y-3">
                <div className="text-xs space-y-1 p-3 rounded-md bg-amber-50 border border-amber-200">
                  <div className="font-medium text-amber-800">طلب تمديد معلّق للمراجعة</div>
                  <div className="text-amber-700">السبب: {action.extension_reason}</div>
                  <div className="text-amber-700">الموعد المقترح: {formatDate(action.extension_new_deadline)}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => reviewExtension("approved")} disabled={saving} className="flex-1">اعتماد</Button>
                  <Button size="sm" variant="outline" onClick={() => reviewExtension("rejected")} disabled={saving} className="flex-1">رفض</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="mb-1.5">سبب التمديد</Label>
                  <Textarea rows={2} value={extReason} onChange={(e) => setExtReason(e.target.value)} placeholder="مبرر طلب تمديد الموعد النهائي…" />
                </div>
                <div>
                  <Label className="mb-1.5">الموعد المقترح الجديد</Label>
                  <Input type="date" value={extDeadline} onChange={(e) => setExtDeadline(e.target.value)} />
                </div>
                <Button size="sm" variant="outline" onClick={requestExtension} disabled={saving || !extReason.trim() || !extDeadline} className="w-full">تقديم طلب التمديد</Button>
              </div>
            )}
          </Section>

          {/* الالتزام */}
          <Section icon={ShieldCheck} title="الالتزام · Compliance & Evidence">
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5">رابط الأدلة</Label>
                <Input type="url" value={form.evidence_url} onChange={(e) => set("evidence_url", e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <Label className="mb-1.5">ملاحظات الالتزام</Label>
                <Textarea rows={2} value={complianceNotes} onChange={(e) => setComplianceNotes(e.target.value)} placeholder="ملاحظات التحقق من الالتزام…" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.compliance_verified} onChange={(e) => set("compliance_verified", e.target.checked)} className="accent-primary" />
                اعتماد الالتزام والأدلة
              </label>
              <Button size="sm" onClick={saveCompliance} disabled={saving} className="w-full">
                <FileCheck className="w-3.5 h-3.5" /> حفظ الالتزام
              </Button>
            </div>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}