import React from "react";
import { Link } from "react-router-dom";
import { FileText, Lock, Compass, AlertTriangle, Plug, RefreshCw, ShieldAlert, SearchX } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { SURFACE_STATE, isRetryable } from "@/lib/governedState";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/raqeem/EmptyState";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import ExplorationGate from "@/components/demo/ExplorationGate";

// RegisterStatePanel — the ONE surface that renders "why there is nothing to show".
//
// A refusal is never a zero, and a failure is never a zero. Each state says what happened, whether
// a retry can help, and what the safe next step is — without disclosing an internal policy or
// confirming that a protected record exists. Only EMPTY is allowed to read as "no records", and it
// is reachable ONLY after a successful read reported a real count of zero.
export default function RegisterStatePanel({ state, onRetry, icon: Icon = FileText, emptyTitle, emptyDescription, scopeHint }) {
  const { t, dir } = useLanguage();

  if (!state) return null;

  if (state === SURFACE_STATE.LOADING) return <TableSkeleton rows={4} />;

  if (state === SURFACE_STATE.EMPTY) {
    return (
      <EmptyState
        icon={Icon}
        title={emptyTitle || t("لا توجد سجلات", "No records")}
        description={emptyDescription || t("قُرِئ السجل بنجاح، ولا يحتوي على أي سجل في نطاقك الحالي.", "The register was read successfully and holds no record in your current scope.")}
      />
    );
  }

  // The demonstration transition and the lapsed exploration session are full-page journeys of
  // their own — they are never rendered as an inline "nothing here" card.
  if (state === SURFACE_STATE.EXPLORATION) return <ExplorationGate />;

  const content = {
    [SURFACE_STATE.NO_AUTHORITY]: {
      icon: Lock,
      plate: "bg-state-danger-surface ring-state-danger-ink/20",
      ink: "text-state-danger-ink",
      title: t("لا تملك صلاحية عرض هذا السجل", "You do not hold authority to view this register"),
      why: t(
        "هذه ليست قائمة فارغة: القراءة رُفضت لأن حسابك لا يحمل العضوية أو الصلاحية المطلوبة لهذا النطاق.",
        "This is not an empty register: the read was refused because your account holds no membership or authority for this scope."
      ),
      next: t(
        "اطلب إسناد العضوية من مدير اللجنة أو من مسؤول جهتك، ثم أعد المحاولة.",
        "Ask the committee administrator or your organization administrator to assign your membership, then try again."
      ),
    },
    [SURFACE_STATE.OUT_OF_SCOPE]: {
      icon: Compass,
      plate: "bg-state-ceremonial-surface ring-state-ceremonial-ink/20",
      ink: "text-state-ceremonial-ink",
      title: t("هذا السجل خارج نطاق اللجنة المفتوحة", "This register is outside the committee you have open"),
      why: t(
        "الرابط يشير إلى سياق آخر، والقراءة تتبع اللجنة المفتوحة حاليًا لا الرابط.",
        "The link points at another context; the read follows the committee you actually have open, not the link."
      ),
      next: t("افتح اللجنة الصحيحة من مساحة العمل أو من بوابة الجهة.", "Open the right committee from the workspace or the organization portal."),
    },
    [SURFACE_STATE.NOT_FOUND]: {
      icon: SearchX,
      plate: "bg-secondary ring-border",
      ink: "text-muted-foreground",
      title: t("هذا السجل غير متاح", "This record is not available"),
      why: t(
        "لا يمكن عرضه في نطاقك الحالي. لا نُوضّح ما إذا كان السجل موجودًا لحماية سجلات الغير.",
        "It cannot be shown in your current scope. Whether the record exists is deliberately not disclosed, to protect other parties' records."
      ),
      next: t("تحقّق من الرابط أو افتح السجل من سجله الرسمي.", "Check the link, or open the record from its own register."),
    },
    [SURFACE_STATE.DEGRADED]: {
      icon: Plug,
      plate: "bg-state-warning-surface ring-state-warning-ink/20",
      ink: "text-state-warning-ink",
      title: t("خدمة مساندة غير متاحة الآن", "A supporting service is unavailable right now"),
      why: t(
        "هذه ليست قائمة فارغة: جزء من بيانات هذا السجل تعذّر جلبه من مزوّد خارجي، وما ظهر هو ما تم التحقق منه فقط.",
        "This is not an empty register: part of this register could not be fetched from an external provider, and what is shown is only what was verified."
      ),
      next: t("أعد المحاولة، أو تابع العمل على ما تم التحقق منه.", "Retry, or continue with what has been verified."),
    },
    [SURFACE_STATE.ERROR]: {
      icon: AlertTriangle,
      plate: "bg-state-danger-surface ring-state-danger-ink/20",
      ink: "text-state-danger-ink",
      title: t("تعذّر إكمال القراءة", "The read could not be completed"),
      why: t(
        "فشل تقني في الطلب، ولم تُعرض أي بيانات غير مؤكدة.",
        "The request failed technically, and no unconfirmed data was displayed."
      ),
      next: t("أعد المحاولة. إذا تكرّر الفشل فأبلغ مسؤول المنصة مع وقت المحاولة.", "Retry. If it repeats, report it to the platform administrator with the time of the attempt."),
    },
    [SURFACE_STATE.SESSION_ENDED]: {
      icon: ShieldAlert,
      plate: "bg-state-warning-surface ring-state-warning-ink/20",
      ink: "text-state-warning-ink",
      title: t("انتهت جلسة الاستكشاف", "The exploration session has ended"),
      why: t(
        "الجلسة قصيرة العمر أو أُلغيت، ولا يجوز إظهار بياناتها من الذاكرة.",
        "The session is short-lived or was revoked, and its data must not be shown from memory."
      ),
      next: t("أعد الدخول إلى الاستكشاف لجلسة جديدة.", "Re-enter the exploration experience for a new session."),
    },
  }[state];

  if (!content) return null;
  const StateIcon = content.icon;

  return (
    <div className="raqeem-card p-6 space-y-3" dir={dir}>
      <div className="flex items-start gap-3">
        <span className={`w-10 h-10 rounded-lg ring-1 flex items-center justify-center shrink-0 ${content.plate}`}>
          <StateIcon className={`w-5 h-5 ${content.ink}`} aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">{content.title}</p>
          <p className="text-xs text-muted-foreground">{content.why}</p>
          <p className="text-xs text-muted-foreground">{content.next}</p>
          {scopeHint ? <p className="text-xs text-muted-foreground">{scopeHint}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isRetryable(state) && onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            {t("إعادة المحاولة", "Retry")}
          </Button>
        ) : null}
        {state === SURFACE_STATE.SESSION_ENDED ? (
          <Button size="sm" asChild>
            <Link to="/explore">{t("إعادة الدخول إلى الاستكشاف", "Re-enter exploration")}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}