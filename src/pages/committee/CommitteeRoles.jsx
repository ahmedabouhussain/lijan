import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { Award } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";

const ROLE_INFO = {
  chair: { ar: "الرئيس", en: "Chair", color: "bg-primary/10 text-primary" },
  vice_chair: { ar: "نائب الرئيس", en: "Vice Chair", color: "bg-primary/10 text-primary" },
  secretary: { ar: "أمين السر", en: "Secretary", color: "bg-blue-100 text-blue-700" },
  member: { ar: "عضو", en: "Member", color: "bg-secondary text-secondary-foreground" },
  alternate: { ar: "بديل", en: "Alternate", color: "bg-amber-100 text-amber-700" },
  observer: { ar: "مراقب", en: "Observer", color: "bg-gray-100 text-gray-600" },
  advisor: { ar: "مستشار", en: "Advisor", color: "bg-purple-100 text-purple-700" },
};

const AUTH_INFO = {
  decision: { ar: "قرار", en: "Decision" },
  approval: { ar: "اعتماد", en: "Approval" },
  execution: { ar: "تنفيذ", en: "Execution" },
  oversight: { ar: "إشراف", en: "Oversight" },
  escalation: { ar: "تصعيد", en: "Escalation" },
  advisory: { ar: "استشاري", en: "Advisory" },
};

export default function CommitteeRoles() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("roles");
  if (!data) return null;
  const members = data.members || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("الأدوار والصلاحيات", "Roles & Authorities", lang)}</h1>
      </div>
      {(() => {
        const desc = getDescription("", "", lang);
        return desc ? <p className="text-sm text-muted-foreground -mt-2">{desc}</p> : null;
      })()}
      <div className="raqeem-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-right p-3 font-medium">{t("العضو", "Member")}</th>
              <th className="text-right p-3 font-medium">{t("الدور", "Role")}</th>
              <th className="text-right p-3 font-medium">{t("مستوى الصلاحية", "Authority Level")}</th>
              <th className="text-right p-3 font-medium">{t("حق التصويت", "Voting Right")}</th>
              <th className="text-right p-3 font-medium">{t("المؤسسة", "Institution")}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const ri = ROLE_INFO[m.role] || ROLE_INFO.member;
              const ai = AUTH_INFO[m.authority_level] || AUTH_INFO.decision;
              return (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-3 font-medium">{m.full_name || m.full_name_ar}</td>
                  <td className="p-3"><StatusBadge label={t(ri.ar, ri.en)} colorClass={ri.color} /></td>
                  <td className="p-3 text-muted-foreground">{t(ai.ar, ai.en)}</td>
                  <td className="p-3">{m.voting_right ? "✓" : "—"}</td>
                  <td className="p-3 text-muted-foreground">{m.institution_name || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}