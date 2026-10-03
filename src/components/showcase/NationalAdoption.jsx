import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const PATHWAY = [
  { ar: 'تجربة تنفيذية محكومة', en: 'Controlled Executive Demonstration' },
  { ar: 'مشروع تجريبي للجنة واحدة', en: 'Single-Committee Pilot' },
  { ar: 'توسيع متعدد اللجان والجهات', en: 'Multi-Committee and Multi-Entity Expansion' },
  { ar: 'قدرة وطنية مستدامة', en: 'Sustainable National Capability' },
];

const FIELDS = [
  'اللجنة التجريبية', 'مسارات العمل المشمولة', 'الجهات المشاركة', 'الاجتماعات المغطاة',
  'عدد المبادرات', 'آليات الأدلة', 'آليات القرار', 'متطلبات إقامة البيانات',
  'المتطلبات الأمنية', 'معايير القبول', 'خط الأساس للقياس', 'راعي المشروع التجريبي', 'مجلس حوكمة المشروع التجريبي',
];

export default function NationalAdoption() {
  const [draft, setDraft] = useState({});
  const [created, setCreated] = useState(false);

  return (
    <div className="space-y-5" dir="rtl">
      <h2 className="text-lg font-bold">من لجنة واحدة إلى قدرة وطنية لإدارة اللجان</h2>
      <p className="text-xs text-muted-foreground">متاح للمؤسس أو مستخدمي العرض التنفيذي المصرح لهم فقط.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {PATHWAY.map((p, i) => (
          <div key={p.en} className="raqeem-card p-3 text-center">
            <p className="text-xs text-muted-foreground">{i + 1}</p>
            <p className="text-sm font-medium mt-1">{p.ar}</p>
            <p className="text-[11px] text-muted-foreground">{p.en}</p>
          </div>
        ))}
      </div>

      <div className="raqeem-card p-4 space-y-3">
        <p className="text-sm font-semibold">تعريف المشروع التجريبي (قابل للتعديل)</p>
        <div className="grid md:grid-cols-2 gap-2">
          {FIELDS.map((f) => (
            <Input
              key={f}
              placeholder={f}
              value={draft[f] || ''}
              onChange={(e) => setDraft((d) => ({ ...d, [f]: e.target.value }))}
            />
          ))}
        </div>
        <Textarea placeholder="معايير القبول — تفاصيل إضافية" rows={3} />
        <Button onClick={() => setCreated(true)}>
          تصميم مشروع تجريبي محكوم بالتعاون مع بنك قطر للتنمية والجهات الوطنية المعنية
        </Button>
        {created && (
          <p className="text-xs text-emerald-700">
            تم إنشاء مسودة مقترح فقط — لم يُرسَل أو يُنشَر أو يُعتمَد أي شيء. يتطلب تأكيداً صريحاً من المؤسس للمتابعة.
          </p>
        )}
      </div>
    </div>
  );
}