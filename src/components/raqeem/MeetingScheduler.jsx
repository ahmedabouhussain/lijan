import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarPlus, X, Repeat } from "lucide-react";

const MEETING_MODES = {
  physical: { ar: "حضوري", en: "Physical" },
  online: { ar: "عن بُعد", en: "Online" },
  hybrid: { ar: "مختلط", en: "Hybrid" },
};

const PROVIDERS = {
  none: { ar: "بدون", en: "None" },
  teams: { ar: "Teams", en: "Teams" },
  zoom: { ar: "Zoom", en: "Zoom" },
  webex: { ar: "Webex", en: "Webex" },
  google_meet: { ar: "Google Meet", en: "Google Meet" },
  external_link: { ar: "رابط خارجي", en: "External Link" },
  sovereign: { ar: "قناة سيادية", en: "Sovereign" },
};

const RECURRENCE_PATTERNS = {
  none: { ar: "مرة واحدة", en: "Once", days: 0 },
  weekly: { ar: "أسبوعي", en: "Weekly", days: 7 },
  biweekly: { ar: "كل أسبوعين", en: "Bi-weekly", days: 14 },
  monthly: { ar: "شهري", en: "Monthly", days: 30 },
  quarterly: { ar: "ربع سنوي", en: "Quarterly", days: 90 },
};

const DEFAULT_FORM = {
  title: "",
  date: "",
  location: "",
  mode: "hybrid",
  provider: "none",
  meeting_url: "",
  quorum_required: 3,
  status: "scheduled",
  recurrence: "none",
  occurrences: 6,
};

function addInterval(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  // preserve local time (datetime-local format)
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MeetingScheduler({ committeeId, onCreated }) {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      const pattern = RECURRENCE_PATTERNS[form.recurrence] || RECURRENCE_PATTERNS.none;
      const isRecurring = form.recurrence !== "none" && form.occurrences > 1;
      const basePayload = {
        committee_id: committeeId,
        title: form.title,
        location: form.location,
        mode: form.mode,
        provider: form.provider,
        meeting_url: form.meeting_url,
        quorum_required: form.quorum_required,
        status: form.status,
        agenda_ready: false,
      };

      if (!isRecurring) {
        const meeting = await base44.entities.Meeting.create({ ...basePayload, date: form.date });
        await base44.entities.AuditLog.create({
          action: "create",
          entity_type: "Meeting",
          entity_id: meeting.id,
          entity_title: form.title,
          description: "جدولة اجتماع",
        });
      } else {
        const count = Math.min(Math.max(form.occurrences, 2), 24);
        const records = Array.from({ length: count }, (_, i) => ({
          ...basePayload,
          title: `${form.title} (${i + 1}/${count})`,
          date: i === 0 ? form.date : addInterval(form.date, pattern.days * i),
        }));
        const created = await base44.entities.Meeting.bulkCreate(records);
        await base44.entities.AuditLog.create({
          action: "create",
          entity_type: "Meeting",
          entity_id: created[0]?.id,
          entity_title: form.title,
          description: `جدولة سلسلة اجتماعات متكررة (${count} اجتماعات — ${pattern.ar})`,
        });
      }
      setForm(DEFAULT_FORM);
      setShow(false);
      onCreated();
    } catch {
    }
    setSaving(false);
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <CalendarPlus className="w-3.5 h-3.5" /> جدولة اجتماع
      </button>
    );
  }

  const isRecurring = form.recurrence !== "none";

  return (
    <div className="border border-border rounded-md p-4 space-y-3 relative">
      <button onClick={() => setShow(false)} className="absolute top-3 left-3 text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
      <div>
        <Label className="text-xs">عنوان الاجتماع *</Label>
        <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="الاجتماع الشهري" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">التاريخ والوقت *</Label>
          <Input type="datetime-local" value={form.date} onChange={(e) => update("date", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">النصاب المطلوب</Label>
          <Input type="number" value={form.quorum_required} onChange={(e) => update("quorum_required", parseInt(e.target.value) || 3)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">الوضع</Label>
          <select value={form.mode} onChange={(e) => update("mode", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
            {Object.entries(MEETING_MODES).map(([k, v]) => (
              <option key={k} value={k}>{v.ar} — {v.en}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">المزود</Label>
          <select value={form.provider} onChange={(e) => update("provider", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
            {Object.entries(PROVIDERS).map(([k, v]) => (
              <option key={k} value={k}>{v.ar} — {v.en}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">الموقع / رابط الاجتماع</Label>
        <Input value={form.location || form.meeting_url} onChange={(e) => update("location", e.target.value)} placeholder="قاعة الاجتماعات أو الرابط" />
      </div>
      <div className="border-t border-border pt-3 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Repeat className="w-3.5 h-3.5" /> التكرار
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">نمط التكرار</Label>
            <select
              value={form.recurrence}
              onChange={(e) => update("recurrence", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.entries(RECURRENCE_PATTERNS).map(([k, v]) => (
                <option key={k} value={k}>{v.ar} — {v.en}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">عدد الاجتماعات</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={form.occurrences}
              disabled={!isRecurring}
              onChange={(e) => update("occurrences", parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
        {isRecurring && form.date && (
          <p className="text-xs text-muted-foreground">
            سيتم إنشاء {Math.min(Math.max(form.occurrences, 2), 24)} اجتماعات، أولها {form.date && new Date(form.date).toLocaleDateString("ar")} ثم كل {RECURRENCE_PATTERNS[form.recurrence].ar}.
          </p>
        )}
      </div>
      <Button size="sm" onClick={create} disabled={saving || !form.title.trim() || !form.date}>
        {saving ? "جارٍ الجدولة..." : isRecurring ? `جدولة ${Math.min(Math.max(form.occurrences, 2), 24)} اجتماعات` : "جدولة"}
      </Button>
    </div>
  );
}