import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/raqeem/PageHeader";
import StickyPageNav from "@/components/raqeem/StickyPageNav";
import { Bell, Mail, MessageSquare, Smartphone, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const EVENT_TYPES = [
  { key: "meeting_scheduled", ar: "جدولة اجتماع", en: "Meeting Scheduled" },
  { key: "meeting_reminder", ar: "تذكير اجتماع", en: "Meeting Reminder" },
  { key: "decision_issued", ar: "إصدار قرار", en: "Decision Issued" },
  { key: "decision_voting_open", ar: "فتح التصويت", en: "Voting Open" },
  { key: "action_assigned", ar: "تكليف بإجراء", en: "Action Assigned" },
  { key: "action_reminder", ar: "تذكير بإجراء", en: "Action Reminder" },
  { key: "minutes_published", ar: "نشر المحضر", en: "Minutes Published" },
  { key: "pack_published", ar: "نشر حزمة الاجتماع", en: "Pack Published" },
  { key: "committee_activated", ar: "تنشيط اللجنة", en: "Committee Activated" },
  { key: "committee_suspended", ar: "تعليق اللجنة", en: "Committee Suspended" },
  { key: "committee_closed", ar: "إغلاق اللجنة", en: "Committee Closed" },
  { key: "amendment_proposed", ar: "اقتراح تعديل", en: "Amendment Proposed" },
];

const CHANNELS = [
  { key: "email_enabled", ar: "البريد الإلكتروني", en: "Email", icon: Mail },
  { key: "in_app_enabled", ar: "داخل التطبيق", en: "In-App", icon: Bell },
  { key: "teams_enabled", ar: "Teams", en: "Teams", icon: MessageSquare },
  { key: "push_enabled", ar: "إشعارات الجوال", en: "Push", icon: Smartphone },
];

export default function NotificationPreferences() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const me = await base44.auth.me();
      const existing = await base44.entities.NotificationPreference.filter({ user_id: me.id });
      if (existing && existing.length > 0) {
        setPrefs(existing[0]);
      } else {
        setPrefs({
          user_id: me.id,
          email_enabled: true,
          in_app_enabled: true,
          teams_enabled: false,
          push_enabled: false,
          digest_frequency: "instant",
        });
      }
    } catch {
      setPrefs({
        email_enabled: true,
        in_app_enabled: true,
        teams_enabled: false,
        push_enabled: false,
        digest_frequency: "instant",
      });
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me();
      if (prefs.id) {
        await base44.entities.NotificationPreference.update(prefs.id, {
          email_enabled: prefs.email_enabled,
          in_app_enabled: prefs.in_app_enabled,
          teams_enabled: prefs.teams_enabled,
          push_enabled: prefs.push_enabled,
          event_type: prefs.event_type || null,
          digest_frequency: prefs.digest_frequency,
          quiet_hours_start: prefs.quiet_hours_start,
          quiet_hours_end: prefs.quiet_hours_end,
        });
      } else {
        const created = await base44.entities.NotificationPreference.create({
          ...prefs,
          event_type: prefs.event_type || null,
          user_id: me.id,
        });
        setPrefs(created);
      }
      toast({ title: t("تم الحفظ", "Saved"), description: t("تم تحديث تفضيلات الإشعارات", "Notification preferences updated") });
    } catch (e) {
      toast({ title: t("خطأ", "Error"), description: e?.message || t("فشلت العملية", "Operation failed"), variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <StickyPageNav crumbs={[{ label: t("تفضيلات الإشعارات", "Notification Preferences"), to: "/notification-preferences" }]} />
      <PageHeader
        icon={Bell}
        title={t("تفضيلات الإشعارات", "Notification Preferences")}
        subtitle={t("تحكم في قنوات وتوقيت استلام إشعاراتك", "Control how and when you receive notifications")}
      />

      <div className="raqeem-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">{t("قنوات الاستلام", "Delivery Channels")}</h3>
        <div className="space-y-3">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon;
            return (
              <div key={ch.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t(ch.ar, ch.en)}</Label>
                  </div>
                </div>
                <Switch
                  checked={!!prefs[ch.key]}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [ch.key]: v }))}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="raqeem-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t("نطاق الأحداث", "Event Scope")}</h3>
        <p className="text-xs text-muted-foreground">
          {t("اختر الأحداث التي تُطبَّق عليها هذه التفضيلات", "Choose which events these preferences apply to")}
        </p>
        <select
          className="w-full h-9 rounded-md border border-input px-3 text-sm"
          value={prefs.event_type || ""}
          onChange={(e) => setPrefs((p) => ({ ...p, event_type: e.target.value || null }))}
        >
          <option value="">{t("كل الأحداث", "All Events")}</option>
          {EVENT_TYPES.map((ev) => (
            <option key={ev.key} value={ev.key}>
              {t(ev.ar, ev.en)}
            </option>
          ))}
        </select>
      </div>

      <div className="raqeem-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">{t("توقيت الاستلام", "Delivery Timing")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">{t("تكرار الملخص", "Digest Frequency")}</Label>
            <select
              className="w-full h-9 rounded-md border border-input px-3 text-sm mt-1"
              value={prefs.digest_frequency || "instant"}
              onChange={(e) => setPrefs((p) => ({ ...p, digest_frequency: e.target.value }))}
            >
              <option value="instant">{t("فوري", "Instant")}</option>
              <option value="hourly">{t("كل ساعة", "Hourly")}</option>
              <option value="daily">{t("يومي", "Daily")}</option>
              <option value="weekly">{t("أسبوعي", "Weekly")}</option>
              <option value="disabled">{t("معطل", "Disabled")}</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">{t("بداية الساعات الهادئة", "Quiet Hours Start")}</Label>
            <input
              type="time"
              className="w-full h-9 rounded-md border border-input px-3 text-sm mt-1"
              value={prefs.quiet_hours_start || ""}
              onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_start: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">{t("نهاية الساعات الهادئة", "Quiet Hours End")}</Label>
            <input
              type="time"
              className="w-full h-9 rounded-md border border-input px-3 text-sm mt-1"
              value={prefs.quiet_hours_end || ""}
              onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_end: e.target.value }))}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("خلال الساعات الهادئة، يتم تأجيل الإشعارات غير العاجلة", "During quiet hours, non-urgent notifications are delayed")}
        </p>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {t("حفظ التفضيلات", "Save Preferences")}
      </Button>
    </div>
  );
}