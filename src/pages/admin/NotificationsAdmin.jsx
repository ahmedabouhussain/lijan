import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell } from "lucide-react";
import { ESCALATION_LEVEL, ACTION_STATUS } from "@/lib/raqeemUtils";

const RULES = [
  { level: "reminder", ar: "تذكير", trigger: "3 أيام قبل الموعد النهائي", channel: "إشعار داخل التطبيق" },
  { level: "priority_reminder", ar: "تذكير أولوية", trigger: "يوم الموعد النهائي", channel: "إشعار + بريد إلكتروني" },
  { level: "owner_secretary", ar: "الأمين", trigger: "بعد الموعد النهائي بيوم", channel: "إشعار للأمين" },
  { level: "chair", ar: "الرئيس", trigger: "بعد التأخير 3 أيام", channel: "تصعيد للرئيس" },
  { level: "escalation_authority", ar: "جهة التصعيد", trigger: "بعد التأخير 7 أيام", channel: "تصعيد رسمي" },
];

export default function NotificationsAdmin() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground">الإدارة</Link>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-semibold">التنبيهات · Notifications</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">التنبيهات · Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">إعدادات الإشعارات وقواعد التصعيد التلقائي</p>
      </div>

      <div className="raqeem-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">قواعد التصعيد · Escalation Rules</h3>
        </div>
        <div className="divide-y divide-border">
          {RULES.map((r) => (
            <div key={r.level} className="px-5 py-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
              <div className="text-sm font-medium">{r.ar}</div>
              <div className="text-xs text-muted-foreground">{r.trigger}</div>
              <div className="text-xs">{r.channel}</div>
            </div>
          ))}
        </div>
      </div>

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