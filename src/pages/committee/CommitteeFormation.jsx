import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
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
  { type: "rename", label: "اقتراح إعادة تسمية", labelEn: "Propose Renaming", icon: Type, color: "text-blue-600" },
  { type: "amend_mandate", label: "اقتراح تعديل الصلاحية", labelEn: "Propose Mandate Amendment", icon: FileText, color: "text-amber-600" },
  { type: "add_member", label: "اقتراح تعيين عضو", labelEn: "Propose Member Appointment", icon: UserPlus, color: "text-green-600" },
  { type: "end_member", label: "اقتراح إنهاء عضوية", labelEn: "Propose End of Membership", icon: UserMinus, color: "text-red-600" },
  { type: "reconstitute", label: "اقتراح إعادة تشكيل", labelEn: "Propose Reconstitution", icon: RefreshCw, color: "text-purple-600" },
];

const AMENDMENT_LABELS = {
  rename: "إعادة تسمية", change_arabic_name: "تغيير الاسم العربي", change_english_name: "تغيير الاسم الإنجليزي",
  add_member: "تعيين عضو", end_member: "إنهاء عضوية", replace_member: "استبدال عضو", change_role: "تغيير دور",
  reconstitute: "إعادة تشكيل", amend_mandate: "تعديل الصلاحية", change_quorum: "تغيير النصاب",
  change_voting_rule: "تغيير قاعدة التصويت", extend_committee: "تمديد اللجنة", renew_committee: "تجديد اللجنة",
  other: "أخرى",
};

const STATUS_COLORS = {
  draft: "bg-secondary text-muted-foreground",
  ai_processing: "bg-blue-100 text-blue-700",
  secretary_review: "bg-indigo-100 text-indigo-700",
  governance_review: "bg-purple-100 text-purple-700",
  legal_review: "bg-amber-100 text-amber-700",
  returned: "bg-orange-100 text-orange-700",
  pending_approval: "bg-cyan-100 text-cyan-700",
  approved: "bg-green-100 text-green-700",
  scheduled: "bg-violet-100 text-violet-700",
  effective: "bg-green-600 text-white",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-200 text-gray-600",
  superseded: "bg-gray-300 text-gray-700",
};

export default function CommitteeFormation() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("formation");
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
      } catch (e) {
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
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GitBranch className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("التشكيل والتعديلات", "Formation & Amendments", lang)}</h1>
      </div>

      {/* Governance notice */}
      <div className="raqeem-card p-4 bg-amber-50/50 border-amber-200">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-amber-800">حوكمة التشكيل · Governed Formation</div>
            <p className="text-xs text-amber-700 leading-relaxed">
              لا يمكن تعديل التشكيل أو التسمية أو الصلاحية مباشرةً. كل تغيير رسمي يمر عبر سير عمل محوَّك:
              اقتراح ← تحليل أثر ← مراجعة ← اعتماد ← نفاذ. التعديلات غير المعتمدة لا تؤثر على الصلاحيات الحالية.
            </p>
          </div>
        </div>
      </div>

      {/* Propose actions */}
      <div className="raqeem-card p-4 space-y-3">
        <div className="text-sm font-semibold">إجراء مقترح · Propose a Change</div>
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
            <span className="text-sm font-semibold">التشكيل الحالي · Current Formation ({ordered.length})</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/members`)} className="h-7 text-xs">
            {t("قائمة الأعضاء", "Member List")}
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
        {ordered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">لا يوجد أعضاء نشطون</div>
        ) : (
          ordered.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-medium">
                  {(m.full_name || "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{m.full_name}</div>
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
            <span className="text-sm font-semibold">الصلاحية والاختصاصات · Charter & Mandate</span>
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
            <div className="text-sm font-semibold">سند التأسيس · Founding Instrument</div>
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
            <span className="text-sm font-semibold">التعديلات المقترحة · Proposed Amendments ({proposed.length})</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/amendments`)} className="h-7 text-xs">
            {t("الكل", "All")}
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
        {loadingAmendments ? (
          <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : proposed.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">لا توجد تعديلات قيد المراجعة</div>
        ) : (
          proposed.slice(0, 5).map((a) => (
            <div key={a.id} className="p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{AMENDMENT_LABELS[a.amendment_type] || a.amendment_type}</div>
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
          <span className="text-sm font-semibold">التغييرات المجدولة · Scheduled Changes ({upcomingScheduled.length})</span>
        </div>
        {upcomingScheduled.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">لا توجد تغييرات مجدولة للنفاذ المستقبلي</div>
        ) : (
          upcomingScheduled.map((a) => (
            <div key={a.id} className="p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{AMENDMENT_LABELS[a.amendment_type] || a.amendment_type}</div>
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
            <span className="text-sm font-semibold">سجل التعديلات · Amendment History</span>
          </div>
          <div className="text-xs text-muted-foreground">{history.length} {t("تعديل منفّذ/مرفوض", "effective/rejected amendments")}</div>
        </button>
        <button
          onClick={() => navigate(`${base}/formation-history`)}
          className="raqeem-card p-4 text-right hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">نسخ التشكيل · Formation Versions</span>
          </div>
          <div className="text-xs text-muted-foreground">{t("الخط الزمني الكامل للتشكيل", "Full formation timeline")}</div>
        </button>
      </div>
    </div>
  );
}