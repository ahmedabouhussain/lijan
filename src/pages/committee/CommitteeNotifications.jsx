import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/raqeem/EmptyState";
import { Bell, Plus, Power, Mail, MessageSquare, Send, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EVENT_OPTIONS = [
  { value: "meeting_scheduled", label_ar: "اجتماع مجدول", label_en: "Meeting Scheduled" },
  { value: "meeting_reminder", label_ar: "تذكير اجتماع", label_en: "Meeting Reminder" },
  { value: "meeting_started", label_ar: "بدء الاجتماع", label_en: "Meeting Started" },
  { value: "decision_issued", label_ar: "إصدار قرار", label_en: "Decision Issued" },
  { value: "action_assigned", label_ar: "تكليف بإجراء", label_en: "Action Assigned" },
  { value: "action_overdue", label_ar: "إجراء متأخر", label_en: "Action Overdue" },
  { value: "amendment_proposed", label_ar: "اقتراح تعديل", label_en: "Amendment Proposed" },
  { value: "amendment_approved", label_ar: "اعتماد تعديل", label_en: "Amendment Approved" },
  { value: "minutes_published", label_ar: "نشر محضر", label_en: "Minutes Published" },
  { value: "invitation_sent", label_ar: "دعوة مرسلة", label_en: "Invitation Sent" },
  { value: "escalation_triggered", label_ar: "تصعيد", label_en: "Escalation" },
  { value: "review_requested", label_ar: "طلب مراجعة", label_en: "Review Requested" },
];

const CHANNEL_ICONS = { email: Mail, in_app: MessageSquare, teams: Send, push: Bell };

export default function CommitteeNotifications() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle } = usePageConfig("notifications");
  const { canManageNotifications } = useCommitteeAdmin();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [prefs, setPrefs] = useState(null);

  const committeeId = data?.committee?.id;
  const orgId = data?.committee?.organization_id;

  const fetchTemplates = async () => {
    try {
      const res = await base44.entities.NotificationTemplate.filter({ organization_id: orgId }, "-created_date", 50);
      setTemplates(res || []);
    } catch { setTemplates([]); }
    setLoading(false);
  };

  const fetchPrefs = async () => {
    try {
      const me = await base44.auth.me();
      const res = await base44.entities.NotificationPreference.filter({ user_id: me.id });
      setPrefs((res || [])[0] || null);
    } catch {}
  };

  useEffect(() => { fetchTemplates(); fetchPrefs(); }, [orgId]);

  const toggleTemplate = async (id, enabled) => {
    try { await base44.entities.NotificationTemplate.update(id, { enabled: !enabled }); fetchTemplates(); } catch {}
  };

  const deleteTemplate = async (id) => {
    if (!confirm(t("حذف هذا القالب؟", "Delete this template?"))) return;
    try { await base44.entities.NotificationTemplate.delete(id); fetchTemplates(); } catch {}
  };

  const togglePref = async (key) => {
    try {
      const me = await base44.auth.me();
      if (prefs) {
        await base44.entities.NotificationPreference.update(prefs.id, { [key]: !prefs[key] });
      } else {
        await base44.entities.NotificationPreference.create({ user_id: me.id, organization_id: orgId, [key]: true });
      }
      fetchPrefs();
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" aria-hidden="true" />
          <h1 className="text-lg font-bold">{getTitle("إعدادات الإشعارات", "Notification Settings", lang)}</h1>
          <span className="text-sm text-muted-foreground">({templates.length})</span>
        </div>
        {canManageNotifications && (
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(!showForm); }}>
            <Plus className="w-4 h-4" />
            {t("قالب جديد", "New Template")}
          </Button>
        )}
      </div>

      {/* User Preferences */}
      <div className="raqeem-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-semibold">{t("تفضيلاتي", "My Preferences")}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: "email_enabled", label: t("بريد إلكتروني", "Email"), icon: Mail },
            { key: "in_app_enabled", label: t("داخل التطبيق", "In-App"), icon: MessageSquare },
            { key: "teams_enabled", label: t("Teams"), icon: Send },
            { key: "push_enabled", label: t("إشعار فوري", "Push"), icon: Bell },
          ].map((p) => {
            const Icon = p.icon;
            const enabled = prefs ? prefs[p.key] : p.key === "email_enabled" || p.key === "in_app_enabled";
            return (
              <button
                key={p.key}
                onClick={() => togglePref(p.key)}
                className={`flex items-center gap-2 p-2.5 rounded-md border text-sm transition-colors ${
                  enabled ? "border-primary/30 bg-primary/5 text-primary" : "border-border bg-secondary/30 text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{p.label}</span>
                <span className={`ml-auto w-9 h-5 rounded-full relative transition-colors ${enabled ? "bg-primary" : "bg-secondary"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enabled ? "left-0.5" : "left-4"}`} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showForm && canManageNotifications && (
        <TemplateForm
          editing={editing}
          orgId={orgId}
          committeeId={committeeId}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSuccess={fetchTemplates}
        />
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : templates.length === 0 ? (
        <EmptyState icon={Bell} title={t("لا توجد قوالب", "No Templates")} description={t("لم يتم تكوين قوالب إشعارات. سيتم استخدام القوالب الافتراضية.", "No notification templates configured. Default templates will be used.")} />
      ) : (
        <div className="space-y-2">
          {templates.map((tmpl) => {
            const Icon = CHANNEL_ICONS[tmpl.channel] || Bell;
            const eventLabel = EVENT_OPTIONS.find((e) => e.value === tmpl.event_type);
            return (
              <div key={tmpl.id} className="raqeem-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {eventLabel ? (lang === "ar" ? eventLabel.label_ar : eventLabel.label_en) : tmpl.event_type}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tmpl.channel} · {tmpl.priority || "normal"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleTemplate(tmpl.id, tmpl.enabled)}
                      className={`p-1.5 rounded-md ${tmpl.enabled ? "text-emerald-600" : "text-muted-foreground"}`}
                      title={tmpl.enabled ? t("تعطيل", "Disable") : t("تفعيل", "Enable")}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    {canManageNotifications && (
                      <>
                        <button onClick={() => { setEditing(tmpl); setShowForm(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-primary">
                          <Settings className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteTemplate(tmpl.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {tmpl.subject_template_ar && (
                  <div className="text-xs text-muted-foreground mt-2 truncate">
                    {tmpl.subject_template_ar}
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

function TemplateForm({ editing, orgId, committeeId, onClose, onSuccess }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    event_type: editing?.event_type || "meeting_scheduled",
    channel: editing?.channel || "in_app",
    subject_template_ar: editing?.subject_template_ar || "",
    subject_template_en: editing?.subject_template_en || "",
    body_template_ar: editing?.body_template_ar || "",
    body_template_en: editing?.body_template_en || "",
    priority: editing?.priority || "normal",
    deep_link_template: editing?.deep_link_template || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.NotificationTemplate.update(editing.id, form);
      } else {
        await base44.entities.NotificationTemplate.create({ ...form, organization_id: orgId, committee_id: committeeId, enabled: true });
      }
      onSuccess();
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="raqeem-card p-4 space-y-3">
      <Label className="text-sm font-semibold">{editing ? t("تعديل القالب", "Edit Template") : t("قالب إشعار جديد", "New Notification Template")}</Label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">{t("نوع الحدث", "Event Type")}</Label>
          <select
            value={form.event_type}
            onChange={(e) => setForm({ ...form, event_type: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {EVENT_OPTIONS.map((e) => <option key={e.value} value={e.value}>{e.label_ar}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">{t("القناة", "Channel")}</Label>
          <select
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="in_app">{t("داخل التطبيق", "In-App")}</option>
            <option value="email">{t("بريد", "Email")}</option>
            <option value="teams">Teams</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">{t("الأولوية", "Priority")}</Label>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="low">{t("منخفضة", "Low")}</option>
            <option value="normal">{t("عادية", "Normal")}</option>
            <option value="high">{t("عالية", "High")}</option>
            <option value="urgent">{t("عاجلة", "Urgent")}</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{t("عنوان (عربي)", "Subject (Arabic)")}</Label>
          <Input value={form.subject_template_ar} onChange={(e) => setForm({ ...form, subject_template_ar: e.target.value })} placeholder="اجتماع: {{meeting_title}}" />
        </div>
        <div>
          <Label className="text-xs">{t("عنوان (إنجليزي)", "Subject (English)")}</Label>
          <Input dir="ltr" value={form.subject_template_en} onChange={(e) => setForm({ ...form, subject_template_en: e.target.value })} placeholder="Meeting: {{meeting_title}}" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{t("نص (عربي)", "Body (Arabic)")}</Label>
          <Textarea rows={3} value={form.body_template_ar} onChange={(e) => setForm({ ...form, body_template_ar: e.target.value })} placeholder="تمت دعوتك لاجتماع {{meeting_title}} بتاريخ {{meeting_date}}" />
        </div>
        <div>
          <Label className="text-xs">{t("نص (إنجليزي)", "Body (English)")}</Label>
          <Textarea rows={3} dir="ltr" value={form.body_template_en} onChange={(e) => setForm({ ...form, body_template_en: e.target.value })} placeholder="You are invited to {{meeting_title}} on {{meeting_date}}" />
        </div>
      </div>
      <div>
        <Label className="text-xs">{t("رابط عميق", "Deep Link Template")}</Label>
        <Input dir="ltr" value={form.deep_link_template} onChange={(e) => setForm({ ...form, deep_link_template: e.target.value })} placeholder="/o/{{org_slug}}/c/{{committee_slug}}/meetings/{{meeting_id}}" />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={saving} onClick={save}>{saving ? t("جارٍ الحفظ...", "Saving...") : t("حفظ", "Save")}</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>{t("إلغاء", "Cancel")}</Button>
      </div>
    </div>
  );
}