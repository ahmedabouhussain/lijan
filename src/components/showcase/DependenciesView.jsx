import React from 'react';
import SourceTag from './SourceTag';

export default function DependenciesView() {
  return (
    <div className="space-y-3" dir="rtl">
      <h2 className="text-lg font-bold">التبعيات بين الجهات</h2>
      <div className="raqeem-card p-4 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-muted-foreground">المبادرة: </span>أولويات مسار الوصول إلى الأسواق</div>
          <div><span className="text-muted-foreground">الجهة المسؤولة: </span>وزارة المالية</div>
          <div><span className="text-muted-foreground">الجهة الداعمة: </span>فريق النفاذ إلى الأسواق</div>
          <div><span className="text-muted-foreground">المطلوب: </span>عرض حول القائمة الإلزامية والقيمة المحلية</div>
          <div><span className="text-muted-foreground">المعيق الحالي: </span>العرض لم يُقدَّم بعد</div>
          <div><span className="text-muted-foreground">الفترة المستهدفة: </span>شهر أكتوبر 2026 (دون تاريخ محدد)</div>
          <div><span className="text-muted-foreground">صاحب التصعيد: </span>أمانة سر اللجنة</div>
          <div><span className="text-muted-foreground">الإجراء المسموح حالياً: </span>متابعة الحالة دون افتراض تاريخ</div>
        </div>
        <SourceTag reference="NSDC Second Meeting pack" asOf="2026-09-08" />
      </div>
    </div>
  );
}