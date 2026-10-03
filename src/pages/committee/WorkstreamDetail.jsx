import React from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import PageHeader from "@/components/raqeem/PageHeader";
import StatusBadge from "@/components/raqeem/StatusBadge";
import OrganizationIdentity from "@/components/raqeem/OrganizationIdentity";
import EmptyState from "@/components/raqeem/EmptyState";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { Progress } from "@/components/ui/progress";
import {
  Network, ChevronLeft, ChevronRight, Target, Users2, Building2,
  CalendarDays, FileText, CheckSquare, Flag,
} from "lucide-react";
import { WORKSTREAM_STATUS, WORKSTREAM_ROLE, ACTION_STATUS, PRIORITY } from "@/lib/raqeemUtils";
import { L } from "@/lib/l10n";

function Section({ icon: Icon, title, children, count }) {
  return (
    <section className="raqeem-card p-4">
      <header className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {title}
        </h2>
        {typeof count === "number" && <span className="text-xs text-muted-foreground arabic-figures">({count})</span>}
      </header>
      {children}
    </section>
  );
}

function NoRecords({ children }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

// The workstream's own descendant workspace. Every record shown belongs to the SAME workstream
// of the SAME committee — the scope comes from the committee context, never from the URL alone.
export default function WorkstreamDetail() {
  const { orgRef, committeeRef, workstreamId } = useParams();
  const { data } = useCommittee();
  const { t, lang } = useLanguage();

  if (!data) return <TableSkeleton rows={5} />;

  const base = `/o/${orgRef}/c/${committeeRef}`;
  const Arrow = lang === "ar" ? ChevronLeft : ChevronRight;
  const ws = (data.workstreams || []).find((w) => w.id === workstreamId);

  if (!ws) {
    return (
      <div className="space-y-4">
        <Link to={`${base}/workstreams`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Arrow className="w-3.5 h-3.5 rotate-180" />
          {t("مسارات العمل", "Workstreams")}
        </Link>
        <EmptyState
          icon={Network}
          title={t("مسار العمل غير متاح", "Workstream unavailable")}
          description={t(
            "مسار العمل المطلوب غير مرتبط بهذه اللجنة أو لم تُمنح لك صلاحية الوصول إليه.",
            "This workstream is not part of this committee, or you do not have access to it."
          )}
        />
      </div>
    );
  }

  const orgIndex = data.org_index || {};
  const members = (data.workstream_memberships || []).filter((m) => m.workstream_id === ws.id && m.status === "active");
  const actions = (data.registers?.actions || []).filter((a) => a.workstream_id === ws.id);
  const documents = (data.registers?.documents || []).filter(
    (d) => d.workstream_id === ws.id || (ws.code && d.tags && String(d.tags).includes(ws.code))
  );
  const initiatives = (data.registers?.initiatives || []).filter(
    (i) => (lang === "ar" ? i.workstream_ar : i.workstream_en) === (lang === "ar" ? ws.name_ar : ws.name_en)
  );
  const meetings = [...(data.meetings?.upcoming || []), ...(data.meetings?.previous || [])].slice(0, 5);
  const leadOrg = ws.lead_organization_id ? orgIndex[ws.lead_organization_id] : null;
  const status = L.status(WORKSTREAM_STATUS, ws.status, ws.status);
  const participating = (ws.participating_organization_ids || []).map((id) => orgIndex[id]).filter(Boolean);

  return (
    <div className="space-y-4">
      <Link to={`${base}/workstreams`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <Arrow className="w-3.5 h-3.5 rotate-180" />
        {t("مسارات العمل", "Workstreams")}
      </Link>

      <PageHeader
        icon={Network}
        title={lang === "ar" ? ws.name_ar : ws.name_en}
        subtitle={lang === "ar" ? ws.mandate_ar : ws.mandate_en}
        badge={<StatusBadge label={status.label} colorClass={status.colorClass} />}
      />

      <div className="raqeem-card p-4">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="text-xs text-muted-foreground">{t("نسبة التقدم", "Progress")}</span>
          <span className="text-xs font-medium arabic-figures">{ws.progress_percent || 0}%</span>
        </div>
        <Progress value={ws.progress_percent || 0} className="h-1.5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Section icon={Target} title={t("الاختصاص", "Mandate")}>
          <p className="text-sm text-foreground leading-relaxed">{lang === "ar" ? ws.mandate_ar : ws.mandate_en}</p>
          {(ws.latest_update_ar || ws.latest_update_en) && (
            <div className="mt-3 pt-3 border-t border-border">
              <h3 className="text-xs font-medium text-muted-foreground mb-1">{t("آخر مستجد", "Latest update")}</h3>
              <p className="text-sm text-foreground leading-relaxed">{lang === "ar" ? ws.latest_update_ar : ws.latest_update_en}</p>
            </div>
          )}
          {(ws.next_steps_ar || ws.next_steps_en) && (
            <div className="mt-3 pt-3 border-t border-border">
              <h3 className="text-xs font-medium text-muted-foreground mb-1">{t("الخطوات التالية", "Next steps")}</h3>
              <p className="text-sm text-foreground leading-relaxed">{lang === "ar" ? ws.next_steps_ar : ws.next_steps_en}</p>
            </div>
          )}
        </Section>

        <Section icon={Building2} title={t("القائد والجهات المشاركة", "Lead and participating institutions")}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{t("قائد المسار", "Lead")}</span>
            <OrganizationIdentity org={leadOrg} size="card" nameClassName="text-sm font-medium" />
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">
              {t("الجهات المشاركة", "Participating institutions")}
            </h3>
            {participating.length === 0 ? (
              <NoRecords>{t("لم تُعتمد جهات مشاركة بعد.", "No participating institutions recorded yet.")}</NoRecords>
            ) : (
              <ul className="space-y-2">
                {participating.map((org, i) => (
                  <li key={i}>
                    <OrganizationIdentity org={org} size="row" nameClassName="text-xs" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </div>

      <Section icon={Users2} title={t("أعضاء مسار العمل", "Workstream members")} count={members.length}>
        {members.length === 0 ? (
          <NoRecords>{t("لم يُعيَّن أعضاء لهذا المسار بعد.", "No members assigned to this workstream yet.")}</NoRecords>
        ) : (
          <div className="divide-y divide-border -mx-4">
            {members.map((m) => {
              const org = m.represented_organization_id ? orgIndex[m.represented_organization_id] : null;
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {lang === "ar" ? m.full_name_ar || m.full_name : m.full_name}
                    </div>
                    <div className="mt-1">
                      <OrganizationIdentity org={org} size="row" nameClassName="text-xs text-muted-foreground" />
                    </div>
                  </div>
                  <StatusBadge
                    label={L.label(WORKSTREAM_ROLE, m.role, m.role)}
                    colorClass="bg-secondary text-muted-foreground"
                  />
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Section icon={CheckSquare} title={t("الإجراءات", "Actions")} count={actions.length}>
          {actions.length === 0 ? (
            <NoRecords>{t("لا توجد إجراءات مرتبطة بهذا المسار.", "No actions linked to this workstream.")}</NoRecords>
          ) : (
            <ul className="divide-y divide-border -mx-4">
              {actions.map((a) => {
                const st = L.status(ACTION_STATUS, a.status, a.status);
                const pr = L.label(PRIORITY, a.priority, a.priority);
                return (
                  <li key={a.id} className="px-4 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-foreground leading-relaxed">
                        {lang === "ar" ? a.title_ar || a.title : a.title}
                      </span>
                      <StatusBadge label={st.label} colorClass={st.colorClass} />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{a.owner_name}</span>
                      <span>{pr}</span>
                      {a.deadline && <span className="arabic-figures">{L.date(a.deadline)}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section icon={CalendarDays} title={t("الاجتماعات ذات الصلة", "Related meetings")} count={meetings.length}>
          {meetings.length === 0 ? (
            <NoRecords>{t("لا توجد اجتماعات مسجلة.", "No meetings recorded.")}</NoRecords>
          ) : (
            <ul className="divide-y divide-border -mx-4">
              {meetings.map((m) => (
                <li key={m.id}>
                  <Link
                    to={`${base}/meetings/${m.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-secondary/40"
                  >
                    <span className="text-sm text-foreground truncate">
                      {lang === "ar" ? m.title_ar || m.title : m.title}
                    </span>
                    <span className="text-xs text-muted-foreground arabic-figures shrink-0">{L.date(m.date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={FileText} title={t("الوثائق", "Documents")} count={documents.length}>
          {documents.length === 0 ? (
            <NoRecords>{t("لا توجد وثائق مرتبطة بهذا المسار.", "No documents linked to this workstream.")}</NoRecords>
          ) : (
            <ul className="divide-y divide-border -mx-4">
              {documents.map((d) => (
                <li key={d.id} className="px-4 py-2.5 text-sm text-foreground">
                  {lang === "ar" ? d.title_ar || d.title : d.title}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={Flag} title={t("المبادرات", "Initiatives")} count={initiatives.length}>
          {initiatives.length === 0 ? (
            <NoRecords>{t("لا توجد مبادرات مرتبطة بهذا المسار.", "No initiatives linked to this workstream.")}</NoRecords>
          ) : (
            <ul className="divide-y divide-border -mx-4">
              {initiatives.map((i) => (
                <li key={i.id} className="px-4 py-2.5 text-sm text-foreground">
                  {lang === "ar" ? i.title_ar || i.title : i.title}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}