import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldX, ChevronDown, ChevronUp, Lock, AlertTriangle } from "lucide-react";

const CAPABILITY_LABELS = {
  vote: { ar: "التصويت", en: "Vote" },
  approve_agenda: { ar: "اعتماد جدول الأعمال", en: "Approve Agenda" },
  certify_attendance: { ar: "إثبات الحضور", en: "Certify Attendance" },
  issue_decision: { ar: "إصدار القرار", en: "Issue Decision" },
  sign_document: { ar: "توقيع الوثيقة", en: "Sign Document" },
  draft_minutes: { ar: "تحرير المحضر", en: "Draft Minutes" },
  create_action: { ar: "إنشاء إجراء", en: "Create Action" },
  close_action: { ar: "إغلاق إجراء", en: "Close Action" },
  manage_members: { ar: "إدارة الأعضاء", en: "Manage Members" },
  close_committee: { ar: "إغلاق اللجنة", en: "Close Committee" },
  view: { ar: "العرض", en: "View" },
  export: { ar: "التصدير", en: "Export" },
};

const ROLE_LABELS_AR = { chair: "رئيس", vice_chair: "نائب الرئيس", secretary: "أمين السر", member: "عضو", alternate: "بديل", observer: "مراقب", advisor: "مستشار", oversight: "إشراف" };
const ROLE_LABELS_EN = { chair: "Chair", vice_chair: "Vice Chair", secretary: "Secretary", member: "Member", alternate: "Alternate", observer: "Observer", advisor: "Advisor", oversight: "Oversight" };

export default function AuthorityLens({ capability, role, isOversight, isRecused, className }) {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const capLabel = CAPABILITY_LABELS[capability]?.[lang === "ar" ? "ar" : "en"] || capability;
  const roleLabel = lang === "ar" ? ROLE_LABELS_AR[role] || role : ROLE_LABELS_EN[role] || role;

  // Determine if allowed
  const votingRoles = ["chair", "vice_chair", "secretary", "member", "alternate"];
  const approvalRoles = ["chair", "vice_chair"];
  const secretaryRoles = ["chair", "vice_chair", "secretary"];
  const managementRoles = ["chair", "vice_chair", "secretary"];

  const capabilityRoles = {
    vote: votingRoles,
    approve_agenda: approvalRoles,
    certify_attendance: secretaryRoles,
    issue_decision: approvalRoles,
    sign_document: ["chair", "vice_chair", "secretary"],
    draft_minutes: secretaryRoles,
    create_action: secretaryRoles,
    close_action: managementRoles,
    manage_members: managementRoles,
    close_committee: ["chair"],
    view: ["chair", "vice_chair", "secretary", "member", "alternate", "observer", "advisor", "oversight"],
    export: approvalRoles,
  };

  const allowedRoles = capabilityRoles[capability] || [];
  const isAllowed = !isOversight && !isRecused && allowedRoles.includes(role);

  const reasons = [];
  if (isOversight) {
    reasons.push(t(
      "وضع الإشراف يمنح قراءة فقط دون صلاحيات تنفيذية داخل اللجنة",
      "Oversight mode grants read-only access without executive authority inside the committee"
    ));
  }
  if (isRecused) {
    reasons.push(t(
      "أنت متنحّي من هذه اللجنة بسبب تعارض مصالح",
      "You are recused from this committee due to a conflict of interest"
    ));
  }
  if (!isOversight && !isRecused && !allowedRoles.includes(role)) {
    reasons.push(t(
      `دورك الحالي (${roleLabel}) لا يملك صلاحية ${capLabel}`,
      `Your current role (${roleLabel}) does not have the ${capLabel} capability`
    ));
  }
  if (isAllowed) {
    reasons.push(t(
      `دورك الحالي (${roleLabel}) يملك صلاحية ${capLabel}`,
      `Your current role (${roleLabel}) has the ${capLabel} capability`
    ));
  }

  return (
    <div className={cn("raqeem-card overflow-hidden", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 p-3 hover:bg-secondary/30 transition-colors text-left"
      >
        {isAllowed ? (
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        ) : (
          <ShieldX className="w-4 h-4 text-red-500 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-foreground">
            {isAllowed
              ? t(`يمكنك ${capLabel}`, `You may ${capLabel}`)
              : t(`لا يمكنك ${capLabel}`, `You cannot ${capLabel}`)}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {t("عدسة الصلاحية", "Authority Lens")} · {roleLabel}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-2">
            {t("التفسير", "Explanation")}
          </div>
          {reasons.map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
              {isAllowed ? (
                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Lock className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
              )}
              <span>{reason}</span>
            </div>
          ))}
          {isOversight && (
            <div className="flex items-start gap-2 text-xs text-amber-700 leading-relaxed pt-1">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{t("إشراف المنظمة لا يمنح صلاحية تصويت داخل اللجنة", "Organization oversight does not grant committee voting authority")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}