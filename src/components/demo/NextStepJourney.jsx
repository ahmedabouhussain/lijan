// The guided journey — one clear next step, then what follows it.
import React from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { formatMeetingDate } from "@/components/demo/meetingDate";

export default function NextStepJourney({ committees, onOpen }) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  const list = committees || [];

  const attention = list
    .filter((c) => (c.indicators?.items_needing_attention || 0) > 0)
    .sort((a, b) => (b.indicators?.items_needing_attention || 0) - (a.indicators?.items_needing_attention || 0));
  const withDocs = list
    .filter((c) => (c.indicators?.unread_documents || 0) > 0)
    .sort((a, b) => (b.indicators?.unread_documents || 0) - (a.indicators?.unread_documents || 0));

  const primary = attention[0] || withDocs[0] || null;
  const rest = [...attention.slice(1), ...withDocs.filter((c) => c.public_id !== primary?.public_id)].slice(0, 2);
  const meeting = formatMeetingDate(primary?.indicators?.next_meeting?.date, lang);

  const stepReason = (c) => {
    const n = c.indicators?.items_needing_attention || 0;
    const d = c.indicators?.unread_documents || 0;
    if (n > 0) return t(`${n} بند يحتاج انتباهك`, `${n} items need your attention`);
    return t(`${d} مستند بحاجة إلى مراجعة`, `${d} documents need review`);
  };

  return (
    <div className="raqeem-card p-4">
      <div className="raqeem-section-title">{t("خطوتك التالية", "Your next step")}</div>

      {!primary ? (
        <div className="mt-2 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t("لا شيء يستدعي تدخلك الآن", "Nothing needs your intervention right now")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t(
                `لديك ${list.length} لجان نشطة — اختر جهة أدناه لعرض لجانها.`,
                `You hold ${list.length} active committees — open an organization below to see its committees.`
              )}
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-foreground mt-1.5">{isAr ? primary.name_ar : primary.name_en}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
            <span>{isAr ? primary.owning_org?.name_ar : primary.owning_org?.name_en}</span>
            <span className="inline-flex items-center gap-1 text-accent font-medium">
              <AlertTriangle className="w-3 h-3" />
              {stepReason(primary)}
            </span>
            {meeting && (
              <span>
                {t("الاجتماع القادم", "Next meeting")}: {meeting}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpen(primary)}
            className="mt-3 inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-2 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            {t("ابدأ من هنا", "Start here")}
            <Arrow className="w-3.5 h-3.5" />
          </button>

          {rest.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border space-y-1">
              <div className="text-[10px] text-muted-foreground">{t("ثم", "Then")}</div>
              {rest.map((c) => (
                <button
                  key={c.public_id}
                  type="button"
                  onClick={() => onOpen(c)}
                  className="w-full flex items-center justify-between gap-3 text-start px-2 py-1.5 rounded hover:bg-secondary/40 transition-colors"
                >
                  <span className="text-[11px] text-foreground truncate">{isAr ? c.name_ar : c.name_en}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{stepReason(c)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}