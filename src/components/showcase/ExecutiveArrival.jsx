import React from 'react';
import { Button } from '@/components/ui/button';
import { NSDC_PERSONA } from '@/lib/nsdcPersona';

export default function ExecutiveArrival({ data, onNavigate }) {
  const openActions = (data.initiatives || []).length;
  const pendingDecisions = data.decision ? 1 : 0;
  const openEvidence = (data.evidence || []).filter((e) => e.entity_name.includes('Qatar Development'));

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h2 className="text-xl font-bold">مرحبًا دكتور حمد</h2>
        <p className="text-sm text-muted-foreground mt-1">
          هذه هي صورة عملك الحالية في فريق النفاذ إلى الأسواق — {NSDC_PERSONA.entity_ar}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'مبادرات أولوية بانتظار متابعة منظمة', value: openActions },
          { label: 'قرار لجنة قيد التحضير', value: pendingDecisions },
          { label: 'تبعية بين الجهات تحتاج تنسيقاً', value: 1 },
          { label: 'حالة أدلة بنك قطر للتنمية', value: openEvidence.length ? 'مستلمة' : '—' },
        ].map((s) => (
          <div key={s.label} className="raqeem-card p-3">
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onNavigate('brief')}>ابدأ ملخصي التنفيذي</Button>
        <Button variant="outline" onClick={() => onNavigate('markets')}>راجع أولويات النفاذ إلى الأسواق</Button>
        <Button variant="outline" onClick={() => onNavigate('evidence')}>جهّز مساهمة بنك قطر للتنمية</Button>
      </div>
    </div>
  );
}