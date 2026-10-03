import React from 'react';
import { Badge } from '@/components/ui/badge';
import SourceTag from './SourceTag';

const STATUS_LABEL = {
  proposed: 'مقترحة', under_review: 'قيد المراجعة', prioritized: 'ذات أولوية', approved: 'معتمدة',
  in_delivery: 'قيد التنفيذ', blocked: 'معلّقة', measuring_impact: 'قياس الأثر', closed: 'مغلقة',
};

export default function InitiativeCard({ initiative, onComment }) {
  const it = initiative;
  return (
    <div className="raqeem-card p-4 space-y-2.5" dir="rtl">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-snug">{it.title_ar}</h3>
        <Badge variant="secondary" className="shrink-0 text-[11px]">{STATUS_LABEL[it.status] || it.status}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{it.objective_ar}</p>

      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        <div><span className="text-muted-foreground">المالك المقترح: </span>{it.proposed_owner}</div>
        <div>
          <span className="text-muted-foreground">حالة التأكيد: </span>
          <span className={it.owner_verification_status === 'confirmed' ? 'text-emerald-700' : 'text-accent'}>
            {it.owner_verification_status === 'confirmed' ? 'مؤكد' : 'يحتاج تأكيداً'}
          </span>
        </div>
        <div className="col-span-2"><span className="text-muted-foreground">آخر تحديث: </span>{it.milestones}</div>
        <div className="col-span-2"><span className="text-muted-foreground">التبعيات: </span>{it.dependencies}</div>
        <div className="col-span-2"><span className="text-muted-foreground">القرار المطلوب: </span>{it.requested_decision}</div>
        <div className="col-span-2"><span className="text-muted-foreground">قياس الأثر: </span>{it.impact_indicators}</div>
        <div className="col-span-2"><span className="text-muted-foreground">الإجراء المسموح به حالياً: </span>{it.next_permitted_action}</div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <SourceTag reference={it.source_reference} asOf={it.source_as_of} />
        <button
          onClick={() => onComment?.(it)}
          className="text-xs text-primary hover:underline shrink-0"
        >
          مراجعة / تعليق
        </button>
      </div>
    </div>
  );
}