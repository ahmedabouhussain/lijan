import React, { useState, useEffect } from "react";
import { useOrg } from "@/lib/OrgContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { Bell, Check, CheckCheck, AlertCircle, Mail, MailOpen, Filter } from "lucide-react";
import EmptyState from "@/components/raqeem/EmptyState";
import { formatDate } from "@/lib/raqeemUtils";
import { Button } from "@/components/ui/button";

const EVENT_LABELS = {
  meeting_scheduled: { ar: "اجتماع مجدول", en: "Meeting Scheduled" },
  meeting_reminder: { ar: "تذكير اجتماع", en: "Meeting Reminder" },
  meeting_started: { ar: "بدء الاجتماع", en: "Meeting Started" },
  meeting_adjourned: { ar: "تأجيل الاجتماع", en: "Meeting Adjourned" },
  meeting_cancelled: { ar: "إلغاء الاجتماع", en: "Meeting Cancelled" },
  decision_issued: { ar: "إصدار قرار", en: "Decision Issued" },
  action_assigned: { ar: "تكليف بإجراء", en: "Action Assigned" },
  action_overdue: { ar: "إجراء متأخر", en: "Action Overdue" },
  amendment_proposed: { ar: "اقتراح تعديل", en: "Amendment Proposed" },
  amendment_approved: { ar: "اعتماد تعديل", en: "Amendment Approved" },
  minutes_published: { ar: "نشر محضر", en: "Minutes Published" },
  invitation_sent: { ar: "دعوة مرسلة", en: "Invitation Sent" },
  escalation_triggered: { ar: "تصعيد", en: "Escalation" },
  review_requested: { ar: "طلب مراجعة", en: "Review Requested" },
  custom: { ar: "إشعار", en: "Notification" },
};

const CHANNEL_ICONS = {
  email: Mail,
  in_app: Bell,
  teams: Mail,
  push: Bell,
};

export default function OrgNotifications() {
  const { data } = useOrg();
  const { t, lang } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread, email, in_app

  const orgId = data?.organization?.id;

  const fetchRecords = async () => {
    if (!orgId) return;
    try {
      const res = await base44.entities.NotificationOutbox.filter({ organization_id: orgId }, "-created_date", 100);
      setRecords(res || []);
    } catch { setRecords([]); }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [orgId]);

  const markAsRead = async (id) => {
    try {
      await base44.entities.NotificationOutbox.update(id, { status: "read", read_at: new Date().toISOString() });
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: "read" } : r)));
    } catch {}
  };

  const markAllRead = async () => {
    const unread = records.filter((r) => r.status !== "read");
    for (const r of unread) {
      try { await base44.entities.NotificationOutbox.update(r.id, { status: "read", read_at: new Date().toISOString() }); } catch {}
    }
    setRecords((prev) => prev.map((r) => ({ ...r, status: "read" })));
  };

  const filtered = records.filter((r) => {
    if (filter === "unread") return r.status !== "read";
    if (filter === "email") return r.channel === "email";
    if (filter === "in_app") return r.channel === "in_app";
    return true;
  });

  const unreadCount = records.filter((r) => r.status !== "read").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" aria-hidden="true" />
          <h1 className="text-lg font-bold">{t("مركز الإشعارات", "Notification Center")}</h1>
          {unreadCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-medium">
              {unreadCount} {t("غير مقروء", "unread")}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" />
            {t("تعليم الكل كمقروء", "Mark all read")}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {[
          { value: "all", label: t("الكل", "All") },
          { value: "unread", label: t("غير مقروء", "Unread") },
          { value: "email", label: t("بريد", "Email") },
          { value: "in_app", label: t("داخل التطبيق", "In-App") },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell} title={t("لا توجد إشعارات", "No Notifications")} description={t("لم يتم تسجيل أي إشعارات.", "No notifications recorded.")} />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const ChannelIcon = CHANNEL_ICONS[r.channel] || Bell;
            const isUnread = r.status !== "read";
            const eventLabel = EVENT_LABELS[r.event_type] || EVENT_LABELS.custom;
            return (
              <div
                key={r.id}
                className={`raqeem-card p-3 flex items-start gap-3 cursor-pointer hover:bg-secondary/20 ${isUnread ? "bg-primary/3" : ""}`}
                onClick={() => { markAsRead(r.id); if (r.deep_link) window.location.href = r.deep_link; }}
              >
                <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${isUnread ? "bg-primary/10" : "bg-secondary"}`}>
                  <ChannelIcon className={`w-4 h-4 ${isUnread ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {lang === "ar" ? r.subject_ar : r.subject_en || r.subject_ar}
                    </span>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {lang === "ar" ? r.body_ar : r.body_en || r.body_ar}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                    <span className="px-1.5 py-0.5 rounded bg-secondary/60">{eventLabel[lang] || eventLabel.ar}</span>
                    {r.source_title && <span className="truncate">· {r.source_title}</span>}
                    <span>· {formatDate(r.created_date)}</span>
                    {r.status === "failed" && <span className="text-destructive">· {t("فشل الإرسال", "Failed")}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}