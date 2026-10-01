import React from "react";
import { Archive, BookOpen, Lightbulb, ShieldCheck } from "lucide-react";

export default function Memory() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الذاكرة المؤسسية · Institutional Memory</h1>
          <p className="text-sm text-muted-foreground mt-1">تحويل السجلات التاريخية إلى ذكاء مؤسسي قابل لإعادة الاستخدام</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="raqeem-card p-5">
          <BookOpen className="w-6 h-6 text-primary mb-3" />
          <h3 className="text-sm font-semibold mb-1">السوابق · Precedents</h3>
          <p className="text-xs text-muted-foreground">قرارات سابقة ذات صلة، نتائجها، ودروسها</p>
        </div>
        <div className="raqeem-card p-5">
          <Lightbulb className="w-6 h-6 text-primary mb-3" />
          <h3 className="text-sm font-semibold mb-1">الدروس · Lessons</h3>
          <p className="text-xs text-muted-foreground">ممارسات ناجحة ومقاربات فاشلة تستحق التذكر</p>
        </div>
        <div className="raqeem-card p-5">
          <ShieldCheck className="w-6 h-6 text-primary mb-3" />
          <h3 className="text-sm font-semibold mb-1">المخاطر · Risks</h3>
          <p className="text-xs text-muted-foreground">مخاطر موثقة من دورات سابقة</p>
        </div>
      </div>

      <div className="raqeem-card p-12 text-center">
        <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-base font-semibold text-foreground mb-2">ذاكرة مؤسسية قيد التطوير</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          تُبنى الذاكرة المؤسسية تلقائيًا عند إغلاق اللجان ودورات القرارات. ستظهر هنا السوابق والدروس والمخاطر الموثقة.
        </p>
      </div>
    </div>
  );
}