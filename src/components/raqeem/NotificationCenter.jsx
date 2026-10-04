import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, X, AlertCircle, Calendar, FileText, Gavel, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { formatDate } from "@/lib/raqeemUtils";

const EVENT_ICONS = {
  meeting_scheduled: Calendar,
  meeting_reminder: Clock,
  meeting_started: Calendar,
  meeting_adjourned: Calendar,
  meeting_cancelled: Calendar,
  agenda_published: FileText,
  pack_published: FileText,
  decision_issued: Gavel,
  decision_voting_open: Gavel,
  action_assigned: Users,
  action_reminder: Clock,
  action_overdue: AlertCircle,
  amendment_proposed: FileText,
  amendment_approved: Check,
  amendment_rejected: X,
  minutes_published: FileText,
  invitation_sent: Users,
  escalation_triggered: AlertCircle,
  review_requested: FileText,
  committee_activated: Check,
  committee_suspended: AlertCircle,
  committee_closed: Check,
  default: Bell,
};

const PRIORITY_COLORS = {
  urgent: "border-r-2 border-destructive",
  high: "border-r-2 border-amber-500",
  normal: "",
  low: "",
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading] = useState(false);
  const dropdownRef = useRef(null);
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await base44.entities.NotificationOutbox.filter(
        { recipient_user_id: "me" },
        "-created_date",
        20
      ).catch(() => base44.entities.NotificationOutbox.list("-created_date", 20));
      const list = res || [];
      setNotifications(list);
      // Unread is read_at, never the delivery status: the delivery truth must survive.
      setUnreadCount(list.filter((n) => !n.read_at).length);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAsRead = async (id) => {
    try {
      await base44.entities.NotificationOutbox.update(id, { read_at: new Date().toISOString() });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read_at);
    for (const n of unread) {
      try {
        await base44.entities.NotificationOutbox.update(n.id, { read_at: new Date().toISOString() });
      } catch {}
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const handleClick = (n) => {
    markAsRead(n.id);
    if (n.deep_link) {
      window.location.href = n.deep_link;
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md hover:bg-secondary text-foreground"
        aria-label={t("الإشعارات", "Notifications")}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover shadow-lg z-50" dir={lang === "ar" ? "rtl" : "ltr"}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <h3 className="text-sm font-semibold">{t("الإشعارات", "Notifications")}</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t("تعليم الكل كمقروء", "Mark all read")}
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {t("لا توجد إشعارات", "No notifications")}
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = EVENT_ICONS[n.event_type] || EVENT_ICONS.default;
                const isUnread = !n.read_at;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`px-3 py-2.5 border-b border-border/50 cursor-pointer hover:bg-secondary/30 ${isUnread ? "bg-primary/3" : ""} ${PRIORITY_COLORS[n.priority] || ""}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${isUnread ? "bg-primary/10" : "bg-secondary"}`}>
                        <Icon className={`w-4 h-4 ${isUnread ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {lang === "ar" ? n.subject_ar : n.subject_en || n.subject_ar}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {lang === "ar" ? n.body_ar : n.body_en || n.body_ar}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {formatDate(n.created_date)}
                          {n.actor_name && ` · ${n.actor_name}`}
                        </div>
                      </div>
                      {isUnread && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 border-t border-border">
            <button
              onClick={() => { navigate("/o/_/notifications"); setOpen(false); }}
              className="w-full text-center text-xs text-primary hover:underline"
            >
              {t("عرض كل الإشعارات", "View all notifications")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}