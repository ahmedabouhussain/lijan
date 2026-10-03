// LIJAN™ — DecisionActionBoard.
// The work group's initiatives, decisions and actions in ONE organised board. Ownership is read
// from dedicated fields (`proposed_owner`, `owner_name`, `owner_organization_id`) — never inferred
// from where a logo happens to sit. Nothing here is invented: absent fields render as absent.

import React from "react";
import { Flag, Gavel, CheckSquare, CalendarDays, CircleUserRound, Link2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import OrganizationMark from "@/components/workgroups/OrganizationMark";
import { Progress } from "@/components/ui/progress";
import { ACTION_STATUS, PRIORITY } from "@/lib/raqeemUtils";
import { L } from "@/lib/l10n";

function Board({ icon: Icon, title, count, children, empty }) {
  return (
    <section className="raqeem-card p-4">
      <header className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          {title}
        </h2>
        <span className="text-xs text-muted-foreground arabic-figures">({count})</span>
      </header>
      {count === 0 ? <p className="text-xs text-muted-foreground">{empty}</p> : children}
    </section>
  );
}

function SourceLine({ record, t }) {
  if (!record.source_reference) return null;
  return (
    <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1 leading-snug">
      <Link2 className="w-3 h-3 shrink-0" aria-hidden="true" />
      {t("المصدر", "Source")}: {record.source_reference}
    </p>
  );
}

export default function DecisionActionBoard({ initiatives = [], decisions = [], actions = [], orgIndex = {}, progressPercent = 0 }) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Initiatives */}
      <Board
        icon={Flag}
        title={t("المبادرات", "Initiatives")}
        count={initiatives.length}
        empty={t("لا توجد مبادرات مسجلة لهذه المجموعة.", "No initiatives recorded for this work group.")}
      >
        <ul className="divide-y divide-border -mx-4">
          {initiatives.map((i) => (
            <li key={i.id} className="px-4 py-3">
              <p className="text-sm font-medium text-foreground leading-snug">
                {isAr ? i.title_ar || i.title : i.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {isAr ? i.objective_ar || i.objective : i.objective}
              </p>
              <div className="mt-2 flex items-center flex-wrap gap-2">
                <StatusBadge label={L.status(ACTION_STATUS, i.status, i.status)?.label || i.status} colorClass="bg-secondary text-muted-foreground" />
                {i.proposed_owner && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <OrganizationMark org={orgIndex[i.owner_organization_id]} size="row" />
                    <CircleUserRound className="w-3 h-3" aria-hidden="true" />
                    {i.proposed_owner}
                  </span>
                )}
              </div>
              <SourceLine record={i} t={t} />
            </li>
          ))}
        </ul>
      </Board>

      {/* Decisions */}
      <Board
        icon={Gavel}
        title={t("القرارات", "Decisions")}
        count={decisions.length}
        empty={t("لا توجد قرارات صادرة عن هذه المجموعة.", "No decisions issued by this work group.")}
      >
        <ul className="divide-y divide-border -mx-4">
          {decisions.map((d) => (
            <li key={d.id} className="px-4 py-3">
              <p className="text-sm text-foreground leading-snug">{isAr ? d.title_ar || d.title : d.title}</p>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <StatusBadge label={d.status} colorClass="bg-secondary text-muted-foreground" />
                {d.decision_date && <span className="text-xs text-muted-foreground arabic-figures">{L.date(d.decision_date)}</span>}
              </div>
            </li>
          ))}
        </ul>
      </Board>

      {/* Actions */}
      <Board
        icon={CheckSquare}
        title={t("الإجراءات", "Actions")}
        count={actions.length}
        empty={t("لا توجد إجراءات مرتبطة بهذه المجموعة.", "No actions linked to this work group.")}
      >
        <ul className="divide-y divide-border -mx-4">
          {actions.map((a) => {
            const st = L.status(ACTION_STATUS, a.status, a.status);
            const pr = L.label(PRIORITY, a.priority, a.priority);
            return (
              <li key={a.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-foreground leading-snug">{isAr ? a.title_ar || a.title : a.title}</p>
                  <StatusBadge label={st.label} colorClass={st.colorClass} />
                </div>
                <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <OrganizationMark org={orgIndex[a.owner_organization_id]} size="row" />
                    <CircleUserRound className="w-3 h-3" aria-hidden="true" />
                    {a.owner_name}
                  </span>
                  <span>{pr}</span>
                  {a.deadline && (
                    <span className="inline-flex items-center gap-1 arabic-figures">
                      <CalendarDays className="w-3 h-3" aria-hidden="true" />
                      {L.date(a.deadline)}
                    </span>
                  )}
                </div>
                {typeof a.progress_percent === "number" && (
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={a.progress_percent} className="h-1.5 flex-1" />
                    <span className="text-[11px] text-muted-foreground arabic-figures">{a.progress_percent}%</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Board>

      {/* Delivery position — the group's own recorded progress. */}
      <Board
        icon={Flag}
        title={t("حالة التنفيذ", "Delivery position")}
        count={1}
        empty=""
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{t("نسبة إنجاز المجموعة", "Work group completion")}</span>
            <span className="text-xs font-medium arabic-figures">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t(
              "النسبة محسوبة من الإجراءات المغلقة والتحقق من الأدلة في هذه المجموعة فقط.",
              "Computed from closed and evidence-verified actions inside this work group only."
            )}
          </p>
        </div>
      </Board>
    </div>
  );
}