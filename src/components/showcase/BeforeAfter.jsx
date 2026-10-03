import React from 'react';

const BEFORE = ['عروض اجتماع ضخمة', 'متابعة بالبريد الإلكتروني', 'جدول بيانات متفرقة', 'حالة غير واضحة', 'تذكير يدوي', 'تتبع محدود للقرارات', 'إعادة تحضير مكررة'];
const WITH = ['مساحة عمل لجنة محكومة', 'تجربة عضو حسب السياق', 'طلبات أدلة منظمة', 'مسؤولية وتبعيات واضحة', 'جاهزية للقرار', 'متابعة تلقائية محكومة', 'ذاكرة مؤسسية', 'نموذج تشغيل وطني قابل لإعادة الاستخدام'];

export default function BeforeAfter() {
  return (
    <div className="space-y-4" dir="rtl">
      <h2 className="text-lg font-bold">قبل ومع لِجان™</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="raqeem-card p-4">
          <p className="text-sm font-semibold mb-2 text-muted-foreground">قبل لِجان™</p>
          <ul className="text-sm space-y-1.5 list-disc pr-4">
            {BEFORE.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
        <div className="raqeem-card p-4 border-primary/30">
          <p className="text-sm font-semibold mb-2 text-primary">مع لِجان™</p>
          <ul className="text-sm space-y-1.5 list-disc pr-4">
            {WITH.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}