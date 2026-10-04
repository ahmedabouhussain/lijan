import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  GitBranch, Loader2, ScrollText, History, FileCheck, CalendarClock,
  UserPlus, UserMinus, RefreshCw, Type, FileText, ShieldCheck, Clock,
  AlertTriangle, ArrowLeft, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/raqeem/StatusBadge";
import FormationImpactPreview from "@/components/raqeem/FormationImpactPreview";
import { MEMBER_ROLE } from "@/lib/raqeemUtils";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { L } from "@/lib/l10n";

const ROLE_ORDER = { chair: 1, vice_chair: 2, secretary: 3, member: 4, alternate: 5, observer: 6, advisor: 7 };

const PROPOSE_ACTIONS = [
  { type: "rename", label: "اقتراح إعادة تسمية", labelEn: "Propose Renaming", icon: Type, color: "text-state-info-ink" },
  { type: "amend_mandate", label: "اقتراح تعديل الصلاحية", labelEn: "Propose Mandate Amendment", icon: FileText, color: "text-amber-600" },
  { type: "add_member", label: "اقتراح تعيين عضو", labelEn: "Propose Member Appointment", icon: UserPlus, color: "text-green-600" },
  { type: "end_member", label: "اقتراح إنهاء عضوية", labelEn: "Propose End of Membership", icon: UserMinus, color: "text-red-600" },
  { type: "reconstitute", label: "اقتراح إعادة تشكيل", labelEn: "Propose Reconstitution", icon: RefreshCw, color: "text-primary" },
];

const AMENDMENT_LABELS = {
  rename: { ar: "إعادة تسمية", en: "Renaming" },
  change_arabic_name: { ar: "تغيير الاسم العربي", en: "Change Arabic Name" },
  change_english_name: { ar: "تغيير الاسم الإنجليزي", en: "Change English Name" },
  add_member: { ar: "تعيين عضو", en: "Member Appointment" },
  end_member: { ar: "إنهاء عضوية", en: "End of Membership" },
  replace_member: { ar: "استبدال عضو", en: "Member Replacement" },
  change_role: { ar: "تغيير دور", en: "Role Change" },
  reconstitute: { ar: "إعادة تشكيل", en: "Reconstitution" },
  amend_mandate: { ar: "تعديل الصلاحية", en: "Mandate Amendment" },
  change_quorum: { ar: "تغيير النصاب", en: "Quorum Change" },
  change_voting_rule: { ar: "تغيير قاعدة التصويت", en: "Voting Rule Change" },
  extend_committee: { ar: "تمديد اللجنة", en: "Committee Extension" },
  renew_committee: { ar: "تجديد اللجنة", en: "Committee Renewal" },
  other: { ar: "أخرى", en: "Other" },
};

const STATUS_COLORS = {
  draft: "bg-secondary text-muted-foreground",
  ai_processing: "bg-state-neutral-surface text-state-neutral-ink",
  secretary_review: "bg-state-info-surface text-state-info-ink",
  governance_review: "bg-state-info-surface text-state-info-ink",
  legal_review: "bg-amber-100 text-amber-700",
  returned: "bg-orange-100 text-orange-700",
  pending_approval: "bg-state-warning-surface text-state-warning-ink",
  approved: "bg-green-100 text-green-700",
  scheduled: "bg-state-progress-surface text-state-progress-ink",
  effective: "bg-green-600 text-white",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-200 text-gray-600",
  superseded: "bg-gray-300 text-gray-700",
};

export default function CommitteeFormation() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle } = usePageConfig("formation");
  const navigate = useNavigate();
  const { orgRef, committeeRef } = useParams();
  const [amendments, setAmendments] = useState([]);
  const [loadingAmendments, setLoadingAmendments] = useState(true);

  const base = `/o/${orgRef}/c/${committeeRef}`;

  useEffect(() => {
    if (!data?.committee) return;
    let cancelled = false;
    (async () => {
      setLoadingAmendments(true);
      try {
        const res = await base44.entities.CommitteeAmendment.filter(
          { committee_id: data.committee.id },
          "-created_date",
          50
        );
        if (!cancelled) setAmendments(res || []);
      } catch {
        if (!cancelled) setAmendments([]);
      }
      if (!cancelled) setLoadingAmendments(false);
    })();
    return () => { cancelled = true; };
  }, [data?.committee?.id]);

  if (!data) return <TableSkeleton rows={4} />;
  const { committee, members } = data;
  const ordered = [...members].sort((a, b) => (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99));

  const proposed = amendments.filter((a) => ["draft", "ai_processing", "secretary_review", "governance_review", "legal_review", "returned", "pending_approval"].includes(a.status));
  const scheduled = amendments.filter((a) => (a.status === "approved" || a.status === "scheduled") && a.effective_date);
  const history = amendments.filter((a) => ["effective", "rejected", "cancelled", "superseded"].includes(a.status));

  const today = new Date().toISOString().split("T")[0];
  const upcomingScheduled = scheduled.filter((a) => a.effective_date >= today);

  const propose = (type) => navigate(`${base}/amendments?type=${type}`);

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <PageHeader icon={GitBranch} title={getTitle("التشكيل والتعديلات", "Formation & Amendments", lang)} />

      {/* Governance notice */}
      <div className="raqeem-card p-4 bg-amber-50/50 border-amber-200">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-state-warning-ink">{t("حوكمة التشكيل", "Governed Formation")}</div>
            <p className="text-xs text-amber-700 leading-relaxed">
              {t(
                "لا يمكن تعديل التشكيل أو التسمية أو الصلاحية مباشرةً. كل تغيير رسمي يمر عبر سير عمل محوَّك: اقتراح ← تحليل أثر ← مراجعة ← اعتماد ← نفاذ. التعديلات غير المعتمدة لا تؤثر على الصلاحيات الحالية.",
                "Formation, naming and mandate cannot be changed directly. Every official change follows a governed workflow: proposal, impact analysis, review, approval, then effectivation. Unapproved amendments do not affect current authority."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Propose actions */}
      <div className="raqeem-card p-4 space-y-3">
        <div className="text-sm font-semibold">{t("إجراء مقترح", "Propose a Change")}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PROPOSE_ACTIONS.map((a) => (
            <button
              key={a.type}
              onClick={() => propose(a.type)}
              className="flex items-center gap-2.5 p-3 rounded-md border border-border bg-card hover:bg-secondary/50 transition-colors text-right"
            >
              <a.icon className={`w-4 h-4 shrink-0 ${a.color}`} />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t(a.label, a.labelEn)}</div>
                <div className="text-[11px] text-muted-foreground truncate">{a.labelEn}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Formation */}
      <div className="raqeem-card divide-y divide-border">
        <div className="p-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{t(`التشكيل الحالي (${ordered.length})`, `Current Formation (${ordered.length})`)}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/members`)} className="h-7 text-xs">
            {t("قائمة الأعضاء", "Member List")}
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
        {ordered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">{t("لا يوجد أعضاء نشطون", "No active members")}</div>
        ) : (
          ordered.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-medium">
                  {(m.full_name || "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{L.name(m, "full_name")}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {m.institution_name || "—"} {m.user_email ? `· ${m.user_email}` : ""}
                  </div>
                </div>
              </div>
              <StatusBadge label={L.label(MEMBER_ROLE, m.role, m.role)} colorClass={MEMBER_ROLE[m.role]?.color} />
            </div>
          ))
        )}
      </div>

 {/* Formation Impact Preview™ — Section 11: shows impact before execution */}
      {proposed.length > 0 && proposed[0] && (
        <FormationImpactPreview
          change={{ type: proposed[0].amendment_type, member_name: proposed[0].member_name }}
          data={data}
        />
      )}

      {/* Charter & Mandate (read-only) */}
      <div className="raqeem-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{t("الصلاحية والاختصاصات", "Charter & Mandate")}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => propose("amend_mandate")} className="h-7 text-xs">
            <FileText className="w-3.5 h-3.5" />
            {t("اقتراح تعديل", "Propose Amendment")}
          </Button>
        </div>
        <div className="space-y-2">
          <div>
            <div className="text-[11px] text-muted-foreground mb-1">{t("الصلاحية", "Mandate")}</div>
            <div className="text-sm whitespace-pre-wrap rounded-md bg-secondary/30 p-3 min-h-[3rem]">
              {L.name(committee, "mandate") || t("غير محدد", "Not specified")}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground mb-1">{t("النطاق والمسؤوليات", "Scope & Responsibilities")}</div>
            <div className="text-sm whitespace-pre-wrap rounded-md bg-secondary/30 p-3 min-h-[3rem]">
              {L.name(committee, "scope") || t("غير محدد", "Not specified")}
            </div>
          </div>
        </div>
      </div>

      {/* Founding Instrument */}
      <div className="raqeem-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FileCheck className="w-4 h-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">{t("سند التأسيس", "Founding Instrument")}</div>
            <div className="text-xs text-muted-foreground">
              {committee.establishing_doc_reference || t("مرجع التأسيس", "Establishing reference")}
            </div>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/establishment`)} className="h-7 text-xs">
          {t("السندات", "Instruments")}
          <ArrowLeft className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Proposed Amendments */}
      <div className="raqeem-card divide-y divide-border">
        <div className="p-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{t(`التعديلات المقترحة (${proposed.length})`, `Proposed Amendments (${proposed.length})`)}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/amendments`)} className="h-7 text-xs">
            {t("الكل", "All")}
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
        {loadingAmendments ? (
          <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : proposed.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">{t("لا توجد تعديلات قيد المراجعة", "No amendments under review")}</div>
        ) : (
          proposed.slice(0, 5).map((a) => (
            <div key={a.id} className="p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t(AMENDMENT_LABELS[a.amendment_type]?.ar ?? a.amendment_type, AMENDMENT_LABELS[a.amendment_type]?.en ?? a.amendment_type)}</div>
                {a.description && <div className="text-xs text-muted-foreground truncate">{a.description}</div>}
                {a.impact_summary && (
                  <div className="text-[11px] text-amber-600 truncate mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> {a.impact_summary}
                  </div>
                )}
              </div>
              <StatusBadge label={a.status} colorClass={STATUS_COLORS[a.status] || "bg-secondary"} />
            </div>
          ))
        )}
      </div>

      {/* Scheduled Changes */}
      <div className="raqeem-card divide-y divide-border">
        <div className="p-3 pb-2 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{t(`التغييرات المجدولة (${upcomingScheduled.length})`, `Scheduled Changes (${upcomingScheduled.length})`)}</span>
        </div>
        {upcomingScheduled.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">{t("لا توجد تغييرات مجدولة للنفاذ المستقبلي", "No scheduled changes pending future effectivation")}</div>
        ) : (
          upcomingScheduled.map((a) => (
            <div key={a.id} className="p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t(AMENDMENT_LABELS[a.amendment_type]?.ar ?? a.amendment_type, AMENDMENT_LABELS[a.amendment_type]?.en ?? a.amendment_type)}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t("نفاذ", "Effective")}: {a.effective_date}
                </div>
              </div>
              <StatusBadge label={a.status === "approved" ? "معتمد" : "مجدول"} colorClass={STATUS_COLORS[a.status]} />
            </div>
          ))
        )}
      </div>

      {/* Amendment History + Formation Versions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => navigate(`${base}/amendments`)}
          className="raqeem-card p-4 text-right hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{t("سجل التعديلات", "Amendment History")}</span>
          </div>
          <div className="text-xs text-muted-foreground">{history.length} {t("تعديل منفّذ/مرفوض", "effective/rejected amendments")}</div>
        </button>
        <button
          onClick={() => navigate(`${base}/formation-history`)}
          className="raqeem-card p-4 text-right hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{t("نسخ التشكيل", "Formation Versions")}</span>
          </div>
          <div className="text-xs text-muted-foreground">{t("الخط الزمني الكامل للتشكيل", "Full formation timeline")}</div>
        </button>
      </div>
    </div>
  );
}