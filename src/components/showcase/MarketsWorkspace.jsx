import React, { useState } from 'react';
import InitiativeCard from './InitiativeCard';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function MarketsWorkspace({ data }) {
  const [commenting, setCommenting] = useState(null);
  const [comment, setComment] = useState('');

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h2 className="text-lg font-bold">مساحة عمل الوصول إلى الأسواق</h2>
        <p className="text-xs text-muted-foreground">
          المبادرات ذات الأولوية (4 من 9) — يمكنك المراجعة والتعليق والترشيح وإرفاق الأدلة. اعتماد القرار يبقى بيد اللجنة.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {(data.initiatives || []).map((it) => (
          <InitiativeCard key={it.id} initiative={it} onComment={() => setCommenting(it)} />
        ))}
      </div>

      {commenting && (
        <div className="raqeem-card p-4 space-y-2">
          <p className="text-sm font-medium">تعليق على: {commenting.title_ar}</p>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="اكتب تعليقك أو توصيتك هنا…" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setCommenting(null); setComment(''); }}>حفظ كمسودة</Button>
            <Button size="sm" variant="outline" onClick={() => { setCommenting(null); setComment(''); }}>إلغاء</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">هذا تعليق استكشافي داخل العرض التوضيحي ولا يُعتمد كسجل رسمي.</p>
        </div>
      )}
    </div>
  );
}