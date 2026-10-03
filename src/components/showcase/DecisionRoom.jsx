import React from 'react';
import { Badge } from '@/components/ui/badge';

const STATUS_LABEL = {
  draft: 'مسودة', in_review: 'قيد المراجعة', proposed: 'مقترح', voting: 'قيد التصويت',
  approved: 'معتمد', rejected: 'مرفوض', deferred: 'مؤجل', issued: 'صادر',
};

export default function DecisionRoom({ data }) {
  const d = data.decision;
  if (!d) return <p className="text-sm text-muted-foreground">لا يوجد قرار مُهيَّأ لهذا السياق.</p>;

  const rows = [
    ['سؤال القرار', d.title_ar],
    ['الخلفية', d.proposal],
    ['المبادرات المغطاة', '4 من 9 مبادرات مسار الوصول إلى الأسواق'],
    ['الأدلة الداعمة', 'عرض مجموعة العمل بتاريخ 26 أغسطس 2026'],
    ['الأدلة الناقصة', 'وثائق داعمة لكل مبادرة على حدة — غير متوفرة في المصدر'],
    ['توصيات الأعضاء', 'لم تُسجَّل توصيات فردية في المصدر'],
    ['التبعيات', d.dependencies],
    ['تقييم جاهزية الأمانة', 'جاهز للمناقشة — غير جاهز للاعتماد النهائي حتى استكمال الأدلة الناقصة'],
    ['الصلاحية المسموح بها لاعتماد القرار', 'رئيس اللجنة والأعضاء ذوو حق التصويت فقط'],
  ];

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">غرفة القرار</h2>
        <Badge variant="secondary">{STATUS_LABEL[d.status] || d.status}</Badge>
      </div>
      <table className="w-full text-sm border border-border rounded-md overflow-hidden">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-border last:border-0">
              <td className="p-3 font-medium w-1/3 bg-muted/40">{k}</td>
              <td className="p-3">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground">
        دكتور حمد: لا يحق لك اعتماد أو رفض أو تأجيل هذا القرار دون تفويض صلاحية صريح.
      </p>
    </div>
  );
}