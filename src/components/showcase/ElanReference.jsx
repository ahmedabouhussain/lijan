import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function ElanReference({ data }) {
  const meeting = data.elanMeeting;
  const items = data.elanAgendaItems || [];
  if (!meeting) return null;

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h2 className="text-lg font-bold">مرجع أجندة إعلان — اللجنة التنفيذية</h2>
        <Badge variant="outline" className="mt-1">دور تجريبي افتراضي · Synthetic Demonstration Role</Badge>
      </div>
      <div className="raqeem-card p-3 text-xs text-muted-foreground">
        تم إنشاء بيانات هذا الاجتماع من نموذج أجندة مرفق. لا يثبت المستند الحضور أو الرئاسة أو صدور قرارات.
        <br />
        This meeting record was structured from an attached agenda model. The source does not establish attendance, chairmanship, or issued decisions.
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="raqeem-card p-3"><span className="text-muted-foreground">رقم الاجتماع: </span>01-26</div>
        <div className="raqeem-card p-3"><span className="text-muted-foreground">المدة المخططة: </span>60 دقيقة</div>
        <div className="raqeem-card p-3"><span className="text-muted-foreground">الحضور المسجل: </span>غير متوفر في المصدر</div>
        <div className="raqeem-card p-3"><span className="text-muted-foreground">الرئيس المسجل: </span>غير متوفر في المصدر</div>
      </div>

      <table className="w-full text-sm border border-border rounded-md overflow-hidden">
        <thead className="bg-muted/40">
          <tr>
            <th className="p-2 text-right">البند</th>
            <th className="p-2 text-right">المقدِّم</th>
            <th className="p-2 text-right">المدة</th>
            <th className="p-2 text-right">القرار المطلوب</th>
            <th className="p-2 text-right">حالة الجاهزية</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-border">
              <td className="p-2">{it.title_ar}</td>
              <td className="p-2">{it.presenter}</td>
              <td className="p-2">{it.time_allocation_minutes} دقيقة</td>
              <td className="p-2 text-accent">{it.required_decision}</td>
              <td className="p-2">مستندات ناقصة</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="raqeem-card p-3 text-sm">
        <span className="font-medium">أمين: </span>
        تتضمن الأجندة الأصلية بندين بمدة إجمالية قدرها 60 دقيقة، لكنها لا تحدد القرارات المطلوبة أو المستندات الداعمة أو حالة الجاهزية.
        يمكنني إعداد نسخة منظمة لاستكمال هذه البيانات، دون تغيير السجل الأصلي.
      </div>
    </div>
  );
}