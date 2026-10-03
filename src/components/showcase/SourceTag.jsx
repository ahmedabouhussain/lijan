import React from 'react';

// Small provenance tag used throughout the showcase — every figure/claim must be
// traceable to its source and freshness per the showcase's governance requirements.
export default function SourceTag({ reference, asOf, verification }) {
  return (
    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap" dir="auto">
      <span>المصدر: {reference || 'غير محدد'}</span>
      {asOf && <span>· بتاريخ {asOf}</span>}
      {verification && (
        <span className={verification === 'confirmed' ? 'text-emerald-700' : 'text-accent'}>
          · {verification === 'confirmed' ? 'مؤكد' : 'يحتاج تأكيداً'}
        </span>
      )}
    </div>
  );
}