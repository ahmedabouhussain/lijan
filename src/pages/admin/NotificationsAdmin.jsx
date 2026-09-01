import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, Save, Check, Plus, X, Mail, Smartphone, MessageSquare, AppWindow, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { ESCALATION_LEVEL, ACTION_STATUS } from "@/lib/raqeemUtils";

const DEFAULT_RULES = [
  { level: "reminder", offset_days: -3, channels: ["in_app"], enabled: true },
  { level: "priority_reminder", offset_days: 0, channels: ["in_app", "email"], enabled: true },
  { level: "owner_secretary", offset_days: 1, channels: ["in_app", "email"], enabled: true },
  { level: "chair", offset_days: 3, channels: ["email"], enabled: true },
  { level: "escalation_authority", offset_days: 7, channels: ["email"], enabled: true },
];

const CHANNELS = [
  { key: "in_app", ar: "داخل التطبيق", icon: AppWindow },
  { key: "email", ar: "بريد إلكتروني", icon: Mail },
  { key: "push", ar: "إشعار جوال", icon: Smartphone },
  { key: "sms", ar: "رسالة نصية", icon: MessageSquare },
];

const DEFAULT_CHANNEL_STATE = { in_app: true, email: true, push: false, sms: false, digest_hours: 0 };

const DEFAULT_EVENTS = [
  { key: "deadline_approaching", ar: "اقتراب الموعد النهائي", en: "Deadline Approaching", channels: ["in_app", "email"], enabled: true },
  { key: "action_overdue", ar: "تأخر الإجراء", en: "Action Overdue", channels: ["in_app", "email"], enabled: true },
  { key: "decision_issued", ar: "صدور قرار", en: "Decision Issued", channels: ["in_app"], enabled: true },
  { key: "minutes_ready", ar: "جاهزية المحضر", en: "Minutes Ready", channels: ["in_app", "email"], enabled: true },
  { key: "meeting_scheduled", ar: "جدولة اجتماع", en: "Meeting Scheduled", channels: ["in_app"], enabled: true },
  { key: "vote_requested", ar: "طلب تصويت", en: "Vote Requested", channels: ["in_app", "email"], enabled: true },
  { key: "extension_requested", ar: "طلب تمديد", en: "Extension Requested", channels: ["in_app", "email"], enabled: true },
];

function ChannelPicker({ selected, onChange }) {
  const toggle = (k) => onChange(selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {CHANNELS.map((c) => {
        const on = selected.includes(c.key);
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => toggle(c.key)}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary/30"}`}
          >
            <Icon className="w-3 h-3" /> {c.ar}
          </button>
        );
      })}
    </div>
  );
}

export default function NotificationsAdmin() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [channels, setChannels] = useState(DEFAULT_CHANNEL_STATE);
  const [events, setEvents] = useState(DEFAULT_EVENTS);
  const [saving, setSaving] = useState(null);
  const [savedKey, setSavedKey] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const records = await base44.entities.NotificationConfig.list();
        const map = {};
        (records || []).forEach((r) => { map[r.config_key] = r; });
        if (map.escalation_rules) setRules(map.escalation_rules.payload?.rules || DEFAULT_RULES);
        if (map.channels) setChannels({ ...DEFAULT_CHANNEL_STATE, ...(map.channels.payload || {}) });
        if (map.events) setEvents(map.events.payload?.events || DEFAULT_EVENTS);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const saveSection = async (key, payload) => {
    setSaving(key);
    try {
      const existing = await base44.entities.NotificationConfig.filter({ config_key: key });
      if (existing && existing.length) {
        await base44.entities.NotificationConfig.update(existing[0].id, { payload });
      } else {
        await base44.entities.NotificationConfig.create({ config_key: key, payload });
      }
      await base44.entities.AuditLog.create({
        action: "update",
        entity_type: "NotificationConfig",
        entity_title: key,
        description: "تحديث إعدادات التنبيهات",
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
    } finally {
      setSaving(null);
    }
  };

  const updateRule = (idx, patch) => setRules((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const removeRule = (idx) => setRules((r) => r.filter((_, i) => i !== idx));
  const addRule = () => setRules((r) => [...r, { level: "reminder", offset_days: -1, channels: ["in_app"], enabled: true }]);

  const updateEvent = (idx, patch) => setEvents((e) => e.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const SaveBtn = ({ section, payload, label }) => (
    <button onClick={() => saveSection(section, payload)} disabled={saving === section} className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
      {savedKey === section ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} {label || "حفظ"}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground">الإدارة</Link>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-semibold">التنبيهات · Notifications</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">التنبيهات · Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">إعدادات الإشعارات وقواعد التصعيد التلقائي — قابلة للتحرير</p>
      </div>

      {/* Channel settings */}
      <div className="raqeem-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">قنوات الإشعار · Notification Channels</h3>
          </div>
          <SaveBtn section="channels" payload={channels} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            const on = channels[c.key];
            return (
              <label key={c.key} className={`raqeem-card p-3 cursor-pointer transition-colors ${on ? "ring-1 ring-primary" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <Icon className={`w-4 h-4 ${on ? "text-primary" : "text-muted-foreground"}`} />
                  <input type="checkbox" checked={on} onChange={(e) => setChannels((s) => ({ ...s, [c.key]: e.target.checked }))} className="accent-primary w-4 h-4" />
                </div>
                <div className="text-sm font-medium">{c.ar}</div>
                <div className="text-[11px] text-muted-foreground">{on ? "مُفعّل" : "معطّل"}</div>
              </label>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
          <label className="text-xs text-muted-foreground">تجميع الإشعارات (ساعات):</label>
          <input
            type="number"
            min={0}
            value={channels.digest_hours || 0}
            onChange={(e) => setChannels((s) => ({ ...s, digest_hours: Number(e.target.value) }))}
            className="w-20 h-8 px-2 rounded-md border border-input bg-card text-sm"
          />
          <span className="text-[11px] text-muted-foreground">0 = إرسال فوري</span>
        </div>
      </div>

      {/* Escalation rules */}
      <div className="raqeem-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">قواعد التصعيد · Escalation Rules</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={addRule} className="text-xs flex items-center gap-1 text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> قاعدة</button>
            <SaveBtn section="escalation_rules" payload={{ rules }} />
          </div>
        </div>
        <div className="divide-y divide-border">
          {rules.map((r, idx) => (
            <div key={idx} className="px-5 py-3 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-center">
              <div className="md:col-span-3 flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={r.enabled} onChange={(e) => updateRule(idx, { enabled: e.target.checked })} className="accent-primary w-3.5 h-3.5" />
                  <select value={r.level} onChange={(e) => updateRule(idx, { level: e.target.value })} className="text-sm font-medium bg-transparent border-b border-transparent hover:border-input focus:border-input focus:outline-none">
                    {Object.entries(ESCALATION_LEVEL).map(([k, v]) => <option key={k} value={k}>{v.ar}</option>)}
                  </select>
                </label>
              </div>
              <div className="md:col-span-4 flex items-center gap-2">
                <input
                  type="number"
                  value={r.offset_days}
                  onChange={(e) => updateRule(idx, { offset_days: Number(e.target.value) })}
                  className="w-16 h-8 px-2 rounded-md border border-input bg-card text-sm text-center"
                />
                <span className="text-xs text-muted-foreground">
                  {r.offset_days < 0 ? "أيام قبل الموعد" : r.offset_days === 0 ? "يوم الموعد" : "أيام بعد الموعد"}
                </span>
              </div>
              <div className="md:col-span-4">
                <ChannelPicker selected={r.channels} onChange={(c) => updateRule(idx, { channels: c })} />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <button onClick={() => removeRule(idx)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event subscriptions */}
      <div className="raqeem-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">اشتراكات الأحداث · Event Subscriptions</h3>
          </div>
          <SaveBtn section="events" payload={{ events }} />
        </div>
        <div className="space-y-2">
          {events.map((ev, idx) => (
            <div key={ev.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2 border-b border-border last:border-0">
              <label className="flex items-center gap-2 sm:w-56 shrink-0 cursor-pointer">
                <input type="checkbox" checked={ev.enabled} onChange={(e) => updateEvent(idx, { enabled: e.target.checked })} className="accent-primary w-3.5 h-3.5" />
                <div>
                  <div className={`text-sm font-medium ${ev.enabled ? "text-foreground" : "text-muted-foreground"}`}>{ev.ar}</div>
                  <div className="text-[11px] text-muted-foreground">{ev.en}</div>
                </div>
              </label>
              <div className="flex-1">
                <ChannelPicker selected={ev.channels} onChange={(c) => updateEvent(idx, { channels: c })} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status legend */}
      <div className="raqeem-card p-5">
        <h3 className="text-sm font-semibold mb-3">حالات الإجراءات المرتبطة بالتنبيهات</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ACTION_STATUS).map(([k, v]) => (
            <span key={k} className={`text-xs px-2 py-0.5 rounded-md ${v.color}`}>{v.ar}</span>
          ))}
        </div>
      </div>
    </div>
  );
}