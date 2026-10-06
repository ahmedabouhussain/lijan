import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Inbox, RefreshCw, AlertTriangle, ShieldCheck, BadgeCheck, Vote, Gavel,
  ScrollText, Handshake, FileSearch, CalendarClock, ClipboardList, ChevronLeft, Ban, Building2,
  Download, Printer,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import EmptyState from "@/components/raqeem/EmptyState";
import { cn } from "@/lib/utils";
import { workExportCsv, downloadCsv, openWorkPrintView } from "@/lib/workExport";

// MyWorkInbox — «مساحتي»: what is required of ME now.
//
// One row = one governed act for one person, on one committee, in one capacity. The row states the
// committee, the custodian institution, the capacity, the deadline, the record's state and the ONE next
// action — and it says WHY this person sees it. Filters live in the URL, so returning to the queue
// preserves the reader's context instead of resetting it.
//
// The queue never shows a zero it did not verify: unread sources and excluded committees are listed.

const KIND_ICONS = {
  action_evidence: ClipboardList,
  action_verify: ShieldCheck,
  action_close: BadgeCheck,
  decision_submit: Gavel,
  decision_issue: Gavel,
  decision_execute: Gavel,
  vote_cast: Vote,
  minutes_draft: ScrollText,
  minutes_approve: ScrollText,
  minutes_issue: ScrollText,
  handover_accept: Handshake,
  review_respond: FileSearch,
  seat_expiry: CalendarClock,
};

const TONE = {
  neutral: "bg-state-neutral-surface text-state-neutral-ink",
  progress: "bg-state-progress-surface text-state-progress-ink",
  ceremonial: "bg-state-ceremonial-surface text-state-ceremonial-ink",
  success: "bg-state-success-surface text-state-success-ink",
  warning: "bg-state-warning-surface text-state-warning-ink",
  danger: "bg-state-danger-surface text-state-danger-ink",
};

const GROUP_ORDER = ["preparation", "voting", "issuance", "execution", "verification", "review", "succession", "follow_up"];

export default function MyWorkInbox() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { isDemoMode, demoPersonaKey } = useEffectiveActor();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("GetMyWork", {
        demo_mode: isDemoMode,
        demo_persona: demoPersonaKey,
      });
      const d = res?.data || res;
      if (d?.error) { setError(d.error); setData(null); }
      else { setData(d); setError(null); }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t("تعذّر تحميل صف العمل", "Could not load your work queue"));
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isDemoMode, demoPersonaKey]);

  const activeGroups = (searchParams.get("groups") || "").split(",").filter(Boolean);
  const committeeFilter = searchParams.get("committee") || "all";
  const overdueOnly = searchParams.get("overdue") === "1";

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "all" || value === "" ) next.delete(key); else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const toggleGroup = (group) => {
    const has = activeGroups.includes(group);
    const next = has ? activeGroups.filter((g) => g !== group) : [...activeGroups, group];
    setParam("groups", next.join(","));
  };

  const items = data?.items || [];
  const visible = useMemo(() => items.filter((it) => {
    if (activeGroups.length && !activeGroups.includes(it.group)) return false;
    if (committeeFilter !== "all" && it.place?.committee?.id !== committeeFilter) return false;
    if (overdueOnly && it.deadline_band?.band !== "overdue") return false;
    return true;
  }), [items, activeGroups.join(","), committeeFilter, overdueOnly]);

  const counts = data?.counts || { total: 0, overdue: 0, due_soon: 0 };
  const unread = data?.scope?.unread_sources || [];
  const excluded = data?.scope?.excluded || [];
  const committees = data?.scope?.committees || [];

  // The readable export carries the SAME numbers as the screen: it is built from this response, and it
  // states which filter was applied — so a printed page can never disagree with what the person saw.
  const filtered = activeGroups.length > 0 || committeeFilter !== "all" || overdueOnly;
  const exportScopeLabel = filtered
    ? t("المعروض بالتصفية الحالية", "The rows shown under the current filter")
    : t("كل ما هو مطلوب مني", "Everything required of me");
  const exportFilename = `lijan-my-work-${new Date().toISOString().slice(0, 10)}.csv`;
  const handleExportCsv = () => downloadCsv(exportFilename, workExportCsv({ data, items: visible, scopeLabel: exportScopeLabel, lang }));
  const handlePrint = () => openWorkPrintView({ data, items: visible, scopeLabel: exportScopeLabel, lang });

  if (loading) {
    return (
      <div className="raqeem-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" />
          {t("جارٍ تجميع ما هو مطلوب منك…", "Assembling what is required of you…")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="raqeem-card p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{t("تعذّر تجميع صف العمل", "Could not assemble your queue")}</div>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
            <RefreshCw className="w-3.5 h-3.5" />{t("إعادة المحاولة", "Try again")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-3" dir={lang === "ar" ? "rtl" : "ltr"} aria-label={t("مساحتي", "My Workspace")}>
      {/* Header: the counts describe the queue, and they come from the same items it renders. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/8 ring-1 ring-primary/12">
            <Inbox className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">{t("مساحتي", "My Workspace")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {counts.total === 0
                ? t("لا يوجد عمل معلّق على مقاعدك.", "No pending work on your seats.")
                : t(
                  `${counts.total} بندًا يحتاج إجراءً منك${counts.overdue ? ` — منها ${counts.overdue} متأخر` : ""}${counts.due_soon ? ` و${counts.due_soon} خلال ثلاثة أيام` : ""}`,
                  `${counts.total} item(s) need an act from you${counts.overdue ? `, ${counts.overdue} overdue` : ""}${counts.due_soon ? `, ${counts.due_soon} due within three days` : ""}`
                )}
            </p>
            {/* The reach is a DECLARED measure (work-reach-1.0.0), not a claim: every item beyond the
                two-interaction limit is counted here and named on its own row. */}
            {data?.reach && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {t(
                  `الوصول إلى المهمة: تفاعلان كحدّ أقصى (فتح «مساحتي» ثم السجل نفسه)${data.reach.beyond_max ? ` — و${data.reach.beyond_max} بندًا يحتاج تفاعلًا ثالثًا` : ""}`,
                  `Task reach: two interactions at most (opening «مساحتي», then the record itself)${data.reach.beyond_max ? ` — ${data.reach.beyond_max} item(s) need a third` : ""}`
                )}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
            title={t("تحديث", "Refresh")}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("تحديث", "Refresh")}</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
            title={t("تصدير CSV بالأرقام المعروضة", "Export CSV with the numbers shown")}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("تصدير", "Export")}</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
            title={t("عرض للطباعة أو الحفظ PDF", "Print view or save as PDF")}
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("طباعة", "Print")}</span>
          </button>
        </div>
      </div>

      {/* A notice the server had to make: exploration identity, or oversight that creates no obligation. */}
      {data?.notice && (
        <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          {lang === "ar" ? data.notice.ar : data.notice.en}
        </div>
      )}

      {/* What could NOT be read — never rendered as an empty queue or a zero. */}
      {unread.length > 0 && (
        <div className="rounded-md border border-state-warning-ink/30 bg-state-warning-surface px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-state-warning-ink shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-state-warning-ink">
                {t("لم نستطع قراءة بعض المصادر — القائمة غير مكتملة", "Some sources could not be read — the queue is incomplete")}
              </div>
              <ul className="mt-1 space-y-0.5">
                {unread.map((u) => (
                  <li key={u.source} className="text-[11px] text-state-warning-ink/90">
                    {u.source} — {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Filters — kept in the URL, so opening a task and returning restores this exact view. */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {GROUP_ORDER.filter((g) => (counts.by_group || {})[g]).map((group) => {
              const label = items.find((it) => it.group === group)?.group_label;
              const active = activeGroups.includes(group);
              return (
                <button
                  key={group}
                  onClick={() => toggleGroup(group)}
                  aria-pressed={active}
                  className={cn(
                    "px-2 py-1 rounded-md text-[11px] font-medium border transition-colors",
                    active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-secondary/60"
                  )}
                >
                  {lang === "ar" ? label?.ar : label?.en} ({(counts.by_group || {})[group]})
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setParam("overdue", overdueOnly ? "" : "1")}
            aria-pressed={overdueOnly}
            className={cn(
              "px-2 py-1 rounded-md text-[11px] font-medium border transition-colors",
              overdueOnly ? "bg-state-danger-ink text-primary-foreground border-state-danger-ink" : "bg-card text-foreground border-border hover:bg-secondary/60"
            )}
          >
            {t("المتأخر فقط", "Overdue only")}
          </button>
          {committees.length > 1 && (
            <select
              value={committeeFilter}
              onChange={(e) => setParam("committee", e.target.value)}
              className="px-2 py-1 rounded-md text-[11px] border border-border bg-card text-foreground"
              aria-label={t("تصفية باللجنة", "Filter by committee")}
            >
              <option value="all">{t("كل لجاني", "All my committees")}</option>
              {committees.map((c) => (
                <option key={c.committee?.id} value={c.committee?.id}>
                  {lang === "ar" ? c.committee?.name?.ar : c.committee?.name?.en}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* The queue itself. */}
      {visible.length === 0 ? (
        items.length === 0 ? (
          <div className="raqeem-card p-4">
            <div className="flex items-start gap-3">
              <BadgeCheck className="w-5 h-5 text-state-success-ink shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-foreground">{t("لا يوجد عمل معلّق", "Nothing is pending on your seats")}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    "لا يوجد إجراء أو قرار أو محضر أو حزمة تسليم يطلب إجراءً منك الآن على المقاعد التي تشغلها.",
                    "No action, decision, minutes package or handover currently asks an act from you on the seats you hold."
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Inbox}
            title={t("لا نتائج بالتصفية الحالية", "No items match the current filter")}
            description={t("أزل التصفية لعرض كل ما هو مطلوب منك.", "Clear the filter to see everything required of you.")}
            action={
              <button onClick={() => setSearchParams(new URLSearchParams(), { replace: true })} className="text-xs font-medium text-primary hover:underline">
                {t("مسح التصفية", "Clear filters")}
              </button>
            }
          />
        )
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => {
            const Icon = KIND_ICONS[item.kind] || Inbox;
            const overdue = item.deadline_band?.band === "overdue";
            const stateTone = TONE[item.state?.tone] || TONE.neutral;
            const days = item.deadline_band?.days;
            return (
              <li key={item.id} className={cn("raqeem-card p-3 sm:p-4", overdue && "border-state-danger-ink/40")}>
                <div className="flex items-start gap-3">
                  <div className={cn("shrink-0 w-9 h-9 rounded-lg flex items-center justify-center", stateTone)}>
                    <Icon className="w-4.5 h-4.5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground break-words">{lang === "ar" ? item.title.ar : item.title.en}</span>
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", stateTone)}>
                        {lang === "ar" ? item.state?.ar : item.state?.en}
                      </span>
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.subtitle}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {lang === "ar" ? item.place?.organization?.name?.ar : item.place?.organization?.name?.en}
                      </span>
                      <span>·</span>
                      <span>{lang === "ar" ? item.place?.committee?.name?.ar : item.place?.committee?.name?.en}</span>
                      {item.capacity?.role_label && (
                        <>
                          <span>·</span>
                          <span>{lang === "ar" ? item.capacity.role_label.ar : item.capacity.role_label.en}</span>
                        </>
                      )}
                      {item.deadline && (
                        <>
                          <span>·</span>
                          <span className={cn(overdue && "text-state-danger-ink font-medium")}>
                            {item.deadline.slice(0, 10)}
                            {days !== null && days !== undefined && (
                              overdue
                                ? t(` (متأخر ${Math.abs(days)} يومًا)`, ` (${Math.abs(days)} day(s) overdue)`)
                                : days === 0 ? t(" (اليوم)", " (today)") : t(` (بعد ${days} يومًا)`, ` (in ${days} day(s))`)
                            )}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Why this person sees this item — the authority basis, stated on the row. */}
                    <p className="text-[11px] text-muted-foreground/90 mt-1.5 border-t border-border pt-1.5">
                      <ShieldCheck className="w-3 h-3 inline-block align-[-2px] me-1" aria-hidden="true" />
                      {lang === "ar" ? item.why?.ar : item.why?.en}
                    </p>
                    {item.secondary_state && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {t("حالة الدليل", "Evidence")}: {lang === "ar" ? item.secondary_state.ar : item.secondary_state.en}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <button
                      onClick={() => item.route && navigate(item.route)}
                      disabled={!item.route}
                      className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1.5 rounded-md text-[11px] font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                      {lang === "ar" ? item.next?.label?.ar : item.next?.label?.en}
                      <ChevronLeft className={cn("w-3.5 h-3.5", lang === "ar" ? "" : "rotate-180")} />
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      {item.group_label ? (lang === "ar" ? item.group_label.ar : item.group_label.en) : null}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Committees that produced no work, and why — a scope statement, not a hidden failure. */}
      {excluded.length > 0 && (
        <details className="rounded-md border border-border bg-card px-3 py-2">
          <summary className="text-xs font-medium text-muted-foreground cursor-pointer">
            {t(`${excluded.length} لجنة لا تُنتج التزامًا شخصيًا لك — لماذا؟`, `${excluded.length} committee(s) produce no personal obligation for you — why?`)}
          </summary>
          <ul className="mt-2 space-y-1">
            {excluded.map((e, i) => (
              <li key={`${e.code}-${i}`} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <Ban className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {lang === "ar" ? e.committee?.committee?.name?.ar : e.committee?.committee?.name?.en}
                  {e.reason ? ` — ${e.reason}` : ""}
                  {e.code ? ` (${e.code})` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}