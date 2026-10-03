import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/LanguageContext';

// ELAN reference — a synthetic demonstration record. One language per page: the block
// renders in the active language only and follows the page direction.
export default function ElanReference({ data }) {
  const { t, lang, dir, nameOf, ameen } = useLanguage();
  const meeting = data.elanMeeting;
  const items = data.elanAgendaItems || [];
  if (!meeting) return null;

  return (
    <div className="space-y-4" dir={dir}>
      <div>
        <h2 className="text-lg font-bold">{t('مرجع أجندة إعلان — اللجنة التنفيذية', 'ELAN Agenda Reference — Executive Committee')}</h2>
        <Badge variant="outline" className="mt-1">{t("دور تجريبي افتراضي", "Synthetic Demonstration Role")}</Badge>
      </div>
      <div className="raqeem-card p-3 text-xs text-muted-foreground">
        {t(
          'تم إنشاء بيانات هذا الاجتماع من نموذج أجندة مرفق. لا يثبت المستند الحضور أو الرئاسة أو صدور قرارات.',
          'This meeting record was structured from an attached agenda model. The source does not establish attendance, chairmanship, or issued decisions.'
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="raqeem-card p-3"><span className="text-muted-foreground">{t('رقم الاجتماع: ', 'Meeting number: ')}</span>01-26</div>
        <div className="raqeem-card p-3"><span className="text-muted-foreground">{t('المدة المخططة: ', 'Planned duration: ')}</span>{t('60 دقيقة', '60 minutes')}</div>
        <div className="raqeem-card p-3"><span className="text-muted-foreground">{t('الحضور المسجل: ', 'Recorded attendance: ')}</span>{t('غير متوفر في المصدر', 'Not provided in the source')}</div>
        <div className="raqeem-card p-3"><span className="text-muted-foreground">{t('الرئيس المسجل: ', 'Recorded chair: ')}</span>{t('غير متوفر في المصدر', 'Not provided in the source')}</div>
      </div>

      <table className="w-full text-sm border border-border rounded-md overflow-hidden">
        <thead className="bg-muted/40">
          <tr>
            <th className="p-2 text-start">{t('البند', 'Item')}</th>
            <th className="p-2 text-start">{t('المقدِّم', 'Presenter')}</th>
            <th className="p-2 text-start">{t('المدة', 'Duration')}</th>
            <th className="p-2 text-start">{t('القرار المطلوب', 'Required Decision')}</th>
            <th className="p-2 text-start">{t('حالة الجاهزية', 'Readiness')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-border">
              <td className="p-2">{nameOf(it, lang, 'title')}</td>
              <td className="p-2">{nameOf(it, lang, 'presenter')}</td>
              <td className="p-2">{t(`${it.time_allocation_minutes} دقيقة`, `${it.time_allocation_minutes} minutes`)}</td>
              <td className="p-2 text-accent">{it.required_decision}</td>
              <td className="p-2">{t('مستندات ناقصة', 'Supporting documents missing')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="raqeem-card p-3 text-sm">
        <span className="font-medium">{ameen}: </span>
        {t(
          'تتضمن الأجندة الأصلية بندين بمدة إجمالية قدرها 60 دقيقة، لكنها لا تحدد القرارات المطلوبة أو المستندات الداعمة أو حالة الجاهزية. يمكنني إعداد نسخة منظمة لاستكمال هذه البيانات، دون تغيير السجل الأصلي.',
          'The source agenda contains two items totalling 60 minutes, but it does not state the required decisions, the supporting documents, or a readiness status. I can prepare a structured version to complete these fields, without changing the original record.'
        )}
      </div>
    </div>
  );
}