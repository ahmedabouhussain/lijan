import React, { useMemo, useState } from 'react';
import SourceTag from './SourceTag';

const DATA_LABEL = {
  received: 'مستلمة', awaiting_submission: 'بانتظار التقديم', needs_reconciliation: 'تحتاج مطابقة',
  deadline_not_confirmed: 'الموعد غير مؤكد', exemption_not_confirmed: 'الاستثناء غير مؤكد',
};

export default function EvidenceReadiness({ data }) {
  const [filterType, setFilterType] = useState('all');
  const rows = data.evidence || [];

  const filtered = useMemo(
    () => rows.filter((r) => filterType === 'all' || r.entity_type === filterType),
    [rows, filterType]
  );

  const memberNominated = 19;
  const memberReceived = 11;
  const nonMemberNominated = 11;
  const nonMemberReceived = 4;

  return (
    <div className="space-y-4" dir="rtl">
      <h2 className="text-lg font-bold">جاهزية البيانات والأدلة</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="raqeem-card p-3">
          <p className="text-xl font-bold text-primary">{memberReceived} من {memberNominated}</p>
          <p className="text-xs text-muted-foreground">جهات أعضاء — بيانات مستلمة</p>
        </div>
        <div className="raqeem-card p-3">
          <p className="text-xl font-bold text-primary">{nonMemberReceived} من {nonMemberNominated}</p>
          <p className="text-xs text-muted-foreground">جهات غير أعضاء — بيانات مستلمة</p>
        </div>
      </div>
      <SourceTag reference="NSDC Second Meeting pack" asOf="2026-09-08" />

      <div className="flex gap-2 text-xs">
        {['all', 'member', 'non_member'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1 rounded-full border ${filterType === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
          >
            {t === 'all' ? 'الكل' : t === 'member' ? 'أعضاء' : 'غير أعضاء'}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-2 text-right">الجهة</th>
              <th className="p-2 text-right">النوع</th>
              <th className="p-2 text-right">حالة الترشيح</th>
              <th className="p-2 text-right">حالة البيانات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2">
                  {r.entity_name}
                  {r.is_aggregate_placeholder && (
                    <span className="text-[11px] text-accent block">تجميعي — الهوية الدقيقة غير محددة في المصدر</span>
                  )}
                </td>
                <td className="p-2">{r.entity_type === 'member' ? 'عضو' : 'غير عضو'}</td>
                <td className="p-2">{DATA_LABEL[r.nomination_status] || r.nomination_status}</td>
                <td className="p-2">{DATA_LABEL[r.data_status] || r.data_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}