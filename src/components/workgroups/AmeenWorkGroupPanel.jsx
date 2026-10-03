// LIJAN™ — the work-group face of the ONE assistant «أمين» / AMEEN.
// Context follows the open work group automatically; these are the group's own quick actions.
// Labels switch language with the interface — AMEEN answers in the language of the interface.

import React from "react";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAmeenSafe } from "@/lib/AmeenContext";
import AmeenEmblem from "@/components/ameen/AmeenEmblem";

export default function AmeenWorkGroupPanel({ workGroupNameAr, workGroupNameEn }) {
  const { t, lang } = useLanguage();
  const ameen = useAmeenSafe();
  const isAr = lang === "ar";
  const groupName = isAr ? workGroupNameAr : workGroupNameEn;

  const actions = [
    { ar: "لخّص آخر اجتماع لمجموعة العمل.", en: "Summarise the work group's latest meeting." },
    { ar: "استخرج القرارات الصادرة عن المجموعة.", en: "Extract the decisions issued by the group." },
    { ar: "ما الإجراءات المتأخرة؟", en: "Which actions are overdue?" },
    { ar: "أنشئ موجزًا لرئيس المجموعة.", en: "Create a brief for the work group lead." },
    { ar: "اعرض أعضاء المجموعة والجهات التي يمثلونها.", en: "Show the group's members and the institutions they represent." },
    { ar: "قارن المبادرات بحالة التنفيذ.", en: "Compare the initiatives with their delivery status." },
    { ar: "لخّص الملفات الجديدة منذ آخر اجتماع.", en: "Summarise the new files since the last meeting." },
  ];

  const ask = (prompt) => {
    if (!ameen?.askAmeen) return;
    ameen.askAmeen(isAr ? prompt.ar : prompt.en);
  };

  return (
    <section className="raqeem-card p-4" aria-label={t("أمين — مجموعة العمل", "AMEEN — work group")}>
      <header className="flex items-center gap-2.5 mb-3">
        <AmeenEmblem size={30} tone="outline" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground leading-tight">
            {t("أمين", "AMEEN")}
          </h2>
          <p className="text-xs text-muted-foreground leading-tight">
            {t("سياق مجموعة العمل", "Work group context")}
            {groupName ? ` · ${groupName}` : ""}
          </p>
        </div>
      </header>

      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        {t(
          "يستخدم أمين بيانات هذه المجموعة فقط: اجتماعاتها، قراراتها، إجراءاتها، مبادراتها ووثائقها المصرّح لك بالوصول إليها.",
          "Ameen uses this work group's data only: its meetings, decisions, actions, initiatives and the documents you are authorized to reach."
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.en}
            type="button"
            onClick={() => ask(a)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Sparkles className="w-3 h-3 text-primary" aria-hidden="true" />
            {t(a.ar, a.en)}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
        {t(
          "يذكر أمين المستند والإصدار والصفحة عند الاعتماد على الملفات.",
          "Ameen cites the document, version and page whenever it relies on files."
        )}
      </p>
    </section>
  );
}