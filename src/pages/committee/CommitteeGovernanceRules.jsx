import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { BookOpen } from "lucide-react";

export default function CommitteeGovernanceRules() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  if (!data) return null;
  const { committee } = data;

  const rules = [
    { label: t("نوع اللجنة", "Committee Type"), value: committee.type?.replace(/_/g, " ") },
    { label: t("قاعدة التصويت", "Voting Rule"), value: { simple_majority: t("أغلبية بسيطة", "Simple Majority"), two_thirds: t("ثلثين", "Two-Thirds"), unanimous: t("إجماع", "Unanimous"), chair_decides: t("الرئيس يقرر", "Chair Decides") }[committee.voting_rule] },
    { label: t("النصاب القانوني", "Quorum"), value: `${committee.quorum_count} ${t("أعضاء", "members")}` },
    { label: t("وتيرة الاجتماعات", "Meeting Cadence"), value: { weekly: t("أسبوعي", "Weekly"), biweekly: t("كل أسبوعين", "Biweekly"), monthly: t("شهري", "Monthly"), quarterly: t("ربع سنوي", "Quarterly"), ad_hoc: t("حسب الحاجة", "Ad Hoc") }[committee.meeting_cadence] },
    { label: t("التصنيف الأمني", "Classification"), value: { public: t("عام", "Public"), internal: t("داخلي", "Internal"), confidential: t("سري", "Confidential"), restricted: t("مقيّد", "Restricted"), highly_restricted: t("عالي التقييد", "Highly Restricted") }[committee.classification] },
    { label: t("متطلبات التقارير", "Reporting Requirements"), value: committee.reporting_requirements || "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("قواعد الحوكمة", "Governance Rules")}</h1>
      </div>
      <div className="raqeem-card p-5 space-y-3">
        {rules.map((r, i) => (
          <div key={i} className="flex items-start justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className="text-sm font-medium text-right capitalize">{r.value || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}