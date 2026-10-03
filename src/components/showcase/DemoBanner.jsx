import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function DemoBanner() {
  return (
    <div className="bg-accent/10 border-b border-accent/30 px-4 py-2.5 text-center" dir="auto">
      <p className="text-xs text-foreground/80 leading-relaxed flex items-center justify-center gap-2 flex-wrap">
        <ShieldAlert className="w-3.5 h-3.5 text-accent shrink-0" />
        <span>
          سيناريو توضيحي مبني على مواد الاجتماع المقدمة — لا يمثل نظامًا رسميًا أو سجلًا تشغيليًا حيًا، ولا يعني اعتماد أي جهة أو شخص للمنصة.
        </span>
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        Illustrative scenario based on the provided meeting materials — not an official system or live operational record, and does not imply endorsement by any entity or individual.
      </p>
    </div>
  );
}