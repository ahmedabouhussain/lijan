import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarPlus, X } from "lucide-react";

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

export default function MeetingScheduler({ committeeId, onCreated }) {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: "",
    location: "",
    mode: "hybrid",
    provider: "none",
    meeting_url: "",
    quorum_required: 3,
    status: "scheduled",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      const meeting = await base44.entities.Meeting.create({ ...form, committee_id: committeeId });
      await base44.entities.AuditLog.create({
        action: "create",
        entity_type: "Meeting",
        entity_id: meeting.id,
        entity_title: form.title,
        description: "جدولة اجتماع",
      });
      setForm({ title: "", date: "", location: "", mode: "hybrid", provider: "none", meeting_url: "", quorum_required: 3, status: "scheduled" });
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
      <Button size="sm" onClick={create} disabled={saving || !form.title.trim() || !form.date}>
        {saving ? "جارٍ الجدولة..." : "جدولة"}
      </Button>
    </div>
  );
}