import React from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { COMMITTEE_STATUS, MEMBER_ROLE, MEETING_STATUS, DECISION_STATUS, ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import {
  Building2, Clock, ShieldCheck, UserCircle, Calendar, Users, Gavel,
  CheckSquare, AlertTriangle, FileText, ArrowLeft, Lock, ChevronLeft,
} from "lucide-react";

const ROLE_ORDER = { chair: 1, vice_chair: 2, secretary: 3, member: 4, alternate: 5, observer: 6, advisor: 7 };

export default function CommitteeHome() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  const { orgRef, committeeRef } = useParams();

  if (!data) return null;

  const { committee, mandate, my_role, is_oversight, members, meetings, registers, counters } = data;
  const base = `/o/${orgRef}/c/${committeeRef}`;

  const orderedMembers = [...members].sort((a, b) => (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99));
  const overdueActions = (registers.actions || []).filter((a) => isOverdue(a.deadline) && a.status !== "closed");
  const openActions = (registers.actions || []).filter((a) => !["closed", "verified"].includes(a.status));

  const roleLabel = is_oversight
    ? t("إشراف قراءة فقط", "Oversight (Read-Only)")
    : t(
        { chair: "رئيس", vice_chair: "نائب الرئيس", secretary: "أمين السر", member: "عضو", observer: "مراقب", advisor: "مستشار" }[my_role] || my_role,
        { chair: "Chair", vice_chair: "Vice Chair", secretary: "Secretary", member: "Member", observer: "Observer", advisor: "Advisor" }[my_role] || my_role
      );

  return (
    <div className="space-y-6">
      {/* Context header */}
      <div className="raqeem-card p-5" style={{ borderTop: `4px solid hsl(var(--primary))` }}>
        <div className="flex flex-col gap-3">
          <Link to={`/o/${orgRef}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3" />
            {t("العودة لبوابة المنظمة", "Back to Organization Portal")}
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground">{committee.name_ar || committee.name_en}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{committee.name_en}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge label={COMMITTEE_STATUS[committee.status]?.ar || committee.status} colorClass={COMMITTEE_STATUS[committee.status]?.color} />
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                <UserCircle className="w-3.5 h-3.5" />
                {roleLabel}
              </span>
            </div>
          </div>
          {is_oversight && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800">{t("وضع الإشراف: قراءة فقط. لا يمكنك تنفيذ عمليات اللجنة.", "Oversight mode: read-only. You cannot perform committee operations.")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Committee identity grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Building2, label: t("الجهة المعيّنة", "Appointing Authority"), value: committee.appointing_authority || committee.establishing_authority || "—" },
          { icon: Clock, label: t("المدة", "Term"), value: `${formatDate(committee.term_start)} — ${formatDate(committee.term_end)}` },
          { icon: ShieldCheck, label: t("التصنيف", "Classification"), value: committee.classification || "—" },
          { icon: Users, label: t("الأعضاء", "Members"), value: counters?.members || 0 },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="raqeem-card p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </div>
              <div className="text-sm font-medium text-foreground truncate">{item.value}</div>
            </div>
          );
        })}
      </div>

      {/* Mandate + leadership */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="raqeem-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("الصلاحية", "Mandate")}</h3>
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">{mandate?.text || committee.mandate || t("لم يتم تعريف الصلاحية بعد", "Mandate not yet defined")}</p>
        </div>
        <div className="raqeem-card p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("القيادة", "Leadership")}</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("الرئيس", "Chair")}</span>
            <span className="font-medium text-foreground">{committee.chair_name || "—"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("الأمين", "Secretary")}</span>
            <span className="font-medium text-foreground">{committee.secretary_name || "—"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("قاعدة التصويت", "Voting Rule")}</span>
            <span className="font-medium text-foreground">{committee.voting_rule || "—"}</span>
          </div>
        </div>
      </div>

      {/* My work */}
      {!is_oversight && (
        <div className="raqeem-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            {t("عملي", "My Work")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: t("إجراءات معينة لي", "Actions Assigned to Me"), count: openActions.length, to: "/actions", icon: CheckSquare },
              { label: t("قرارات قيد التصويت", "Decisions in Voting"), count: (registers.decisions || []).filter((d) => d.status === "voting").length, to: "/voting", icon: Gavel },
              { label: t("محاضر للمراجعة", "Minutes for Review"), count: (registers.minutes || []).filter((m) => m.status === "draft" || m.status === "in_review").length, to: "/minutes", icon: FileText },
              { label: t("إجراءات متأخرة", "Overdue Actions"), count: overdueActions.length, to: "/actions", icon: AlertTriangle },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Link key={i} to={`${base}${item.to}`} className="flex items-center gap-2.5 p-2.5 rounded-md bg-secondary/40 hover:bg-secondary/70 transition-colors">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-foreground">{item.count}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.label}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Meetings */}
      <div className="raqeem-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {t("الاجتماعات", "Meetings")}
          </h3>
          <Link to={`${base}/meetings`} className="text-xs text-primary hover:underline">{t("عرض الكل", "View All")}</Link>
        </div>
        {meetings.upcoming.length === 0 && meetings.previous.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد اجتماعات", "No meetings")}</p>
        ) : (
          <div className="space-y-2">
            {meetings.upcoming.slice(0, 3).map((m) => (
              <Link key={m.id} to={`/meetings/${m.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                <div>
                  <div className="text-sm font-medium text-foreground">{m.title || m.title_ar}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(m.date)} · {m.mode}</div>
                </div>
                <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
              </Link>
            ))}
            {meetings.upcoming.length === 0 && meetings.previous.slice(0, 3).map((m) => (
              <Link key={m.id} to={`/meetings/${m.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                <div>
                  <div className="text-sm font-medium text-foreground">{m.title || m.title_ar}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(m.date)}</div>
                </div>
                <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Members */}
      <div className="raqeem-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {t("الأعضاء", "Members")}
          </h3>
          <Link to={`${base}/members`} className="text-xs text-primary hover:underline">{t("عرض الكل", "View All")}</Link>
        </div>
        {orderedMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("لا يوجد أعضاء", "No members")}</p>
        ) : (
          <div className="space-y-1.5">
            {orderedMembers.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{m.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.institution_name || "—"}</div>
                </div>
                <StatusBadge label={MEMBER_ROLE[m.role]?.ar || m.role} colorClass={MEMBER_ROLE[m.role]?.color} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Official records + Execution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="raqeem-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {t("السجلات الرسمية", "Official Records")}
          </h3>
          <div className="space-y-2">
            <Link to={`${base}/minutes`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
              <span className="text-sm text-foreground">{t("المحاضر", "Minutes")}</span>
              <span className="text-sm font-bold text-foreground">{(registers.minutes || []).length}</span>
            </Link>
            <Link to={`${base}/decisions`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
              <span className="text-sm text-foreground">{t("القرارات", "Decisions")}</span>
              <span className="text-sm font-bold text-foreground">{(registers.decisions || []).length}</span>
            </Link>
            <Link to={`${base}/voting`} className="flex items-center justify-between py-2 hover:bg-secondary/30 -mx-2 px-2 rounded">
              <span className="text-sm text-foreground">{t("التصويت", "Voting")}</span>
              <span className="text-sm font-bold text-foreground">{(registers.decisions || []).filter((d) => d.status === "voting").length}</span>
            </Link>
          </div>
        </div>

        <div className="raqeem-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            {t("التنفيذ", "Execution")}
          </h3>
          <div className="space-y-2">
            <Link to={`${base}/actions`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
              <span className="text-sm text-foreground">{t("إجراءات مفتوحة", "Open Actions")}</span>
              <span className="text-sm font-bold text-foreground">{openActions.length}</span>
            </Link>
            <Link to={`${base}/actions`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
              <span className="text-sm text-amber-700">{t("إجراءات متأخرة", "Overdue")}</span>
              <span className="text-sm font-bold text-amber-700">{overdueActions.length}</span>
            </Link>
            <Link to={`${base}/risks`} className="flex items-center justify-between py-2 hover:bg-secondary/30 -mx-2 px-2 rounded">
              <span className="text-sm text-foreground">{t("المخاطر والتبعيات", "Risks & Dependencies")}</span>
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}