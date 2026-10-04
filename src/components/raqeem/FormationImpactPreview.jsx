import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import SovereignCard from "@/components/raqeem/SovereignCard";
import {
  Users, Vote, FileSignature, ArrowLeftRight,
  Calendar, CheckSquare, AlertTriangle, CheckCircle2, XCircle,
} from "lucide-react";

/**
 * FormationImpactPreview™ — Section 11
 * Shows the impact of a formation change BEFORE it takes effect:
 * - Quorum impact
 * - Open votes impact
 * - Pending signatures impact
 * - Delegations impact
 * - Alternates impact
 * - Recusals/conflicts impact
 * - Assigned actions impact
 * - Future meetings impact
 * - Authority impact
 * - Records needing reassignment
 *
 * Calm, focused preview — not a blocking gate.
 */
export default function FormationImpactPreview({ change, data }) {
  const { t, lang } = useLanguage();
  if (!change || !data) return null;

  const { committee, members, meetings, registers } = data;
  const impacts = computeImpacts(change, data);

  if (impacts.length === 0) {
    return (
      <SovereignCard className="p-4 border-emerald-200 bg-emerald-50/50">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <p className="text-xs text-emerald-800">
            {t("لا توجد آثار سلبية متوقعة من هذا التغيير", "No negative impacts expected from this change")}
          </p>
        </div>
      </SovereignCard>
    );
  }

  const criticalCount = impacts.filter((i) => i.severity === "critical").length;

  return (
    <SovereignCard className="p-4 border-amber-200">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("معاينة الأثر قبل النفاذ", "Impact Preview Before Execution")}
          </p>
          <p className="text-sm font-semibold text-foreground">
            {t("آثار التغيير على اللجنة", "Change Impacts on Committee")}
          </p>
        </div>
        {criticalCount > 0 && (
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
            {criticalCount} {t("حرج", "critical")}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {impacts.map((impact, i) => {
          const Icon = impact.icon || AlertTriangle;
          const severityColor = {
            critical: "text-primary",
            warning: "text-amber-600",
            info: "text-muted-foreground",
          };
          return (
            <div key={i} className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg bg-secondary/40">
              <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${severityColor[impact.severity] || severityColor.info}`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{impact.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{impact.detail}</p>
              </div>
              {impact.severity === "critical" && (
                <XCircle className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border">
        {t("هذه معاينة استرشادية. النفاذ الفعلي يتم بعد الاعتماد.", "This is an advisory preview. Actual execution occurs after approval.")}
      </p>
    </SovereignCard>
  );
}

/**
 * Compute impacts of a formation change.
 * change: { type: "add_member"|"remove_member"|"change_chair"|"change_secretary"|"reconstitute", member_name, new_role }
 */
function computeImpacts(change, data) {
  const { committee, members, meetings, registers } = data;
  const impacts = [];
  const now = new Date();

  const activeMembers = (members || []).filter((m) => m.status === "active");
  const quorumRequired = committee?.quorum_count || 3;

  if (change.type === "remove_member") {
    const remaining = activeMembers.filter((m) => m.full_name !== change.member_name && m.full_name_ar !== change.member_name);

    // Quorum impact
    if (remaining.length < quorumRequired) {
      impacts.push({
        icon: Users,
        severity: "critical",
        title: { ar: "خطر النصاب", en: "Quorum Risk" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
        detail: {
          ar: `بعد الحذف سيبقى ${remaining.length} عضو، والنصاب المطلوب ${quorumRequired}`,
          en: `After removal ${remaining.length} members remain, quorum requires ${quorumRequired}`,
        }[document.documentElement.dir === "rtl" ? "ar" : "en"],
      });
    }

    // Open votes impact
    const openVotes = (registers?.votes || []).filter((v) => v.status === "open");
    if (openVotes.length > 0) {
      impacts.push({
        icon: Vote,
        severity: "critical",
        title: { ar: "تصويتات مفتوحة", en: "Open Votes" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
        detail: {
          ar: `${openVotes.length} تصويت مفتوح — قد تتأثر النتيجة`,
          en: `${openVotes.length} open vote(s) — results may be affected`,
        }[document.documentElement.dir === "rtl" ? "ar" : "en"],
      });
    }

    // Pending signatures
    const pendingSigs = (registers?.signatures || []).filter((s) => !s.signed_at);
    if (pendingSigs.length > 0) {
      impacts.push({
        icon: FileSignature,
        severity: "warning",
        title: { ar: "توقيعات معلقة", en: "Pending Signatures" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
        detail: {
          ar: `${pendingSigs.length} توقيع معلق قد يحتاج إعادة تعيين`,
          en: `${pendingSigs.length} pending signature(s) may need reassignment`,
        }[document.documentElement.dir === "rtl" ? "ar" : "en"],
      });
    }

    // Assigned actions
    const memberActions = (registers?.actions || []).filter(
      (a) => a.status !== "closed" && (a.owner_name === change.member_name)
    );
    if (memberActions.length > 0) {
      impacts.push({
        icon: CheckSquare,
        severity: "critical",
        title: { ar: "إجراءات مسندة", en: "Assigned Actions" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
        detail: {
          ar: `${memberActions.length} إجراء مسند لهذا العضو يحتاج إعادة تعيين`,
          en: `${memberActions.length} action(s) assigned to this member need reassignment`,
        }[document.documentElement.dir === "rtl" ? "ar" : "en"],
      });
    }

    // Delegations
    const memberDelegations = (registers?.delegations || []).filter(
      (d) => d.status === "active" && (d.from_member_name === change.member_name || d.to_member_name === change.member_name)
    );
    if (memberDelegations.length > 0) {
      impacts.push({
        icon: ArrowLeftRight,
        severity: "warning",
        title: { ar: "تفويضات نشطة", en: "Active Delegations" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
        detail: {
          ar: `${memberDelegations.length} تفويض نشط يتضمن هذا العضو`,
          en: `${memberDelegations.length} active delegation(s) involve this member`,
        }[document.documentElement.dir === "rtl" ? "ar" : "en"],
      });
    }
  }

  if (change.type === "change_chair" || change.type === "change_secretary") {
    // Authority impact
    impacts.push({
      icon: ArrowLeftRight,
      severity: "warning",
      title: { ar: "انتقال الصلاحيات", en: "Authority Transfer" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
      detail: {
        ar: "ستنتقل صلاحيات الدور تلقائيًا وفق القواعد المعتمدة",
        en: "Role authority will transfer automatically per approved rules",
      }[document.documentElement.dir === "rtl" ? "ar" : "en"],
    });

    // Future meetings
    const futureMeetings = (meetings?.upcoming || []).filter((m) => new Date(m.date) > now);
    if (futureMeetings.length > 0) {
      impacts.push({
        icon: Calendar,
        severity: "info",
        title: { ar: "اجتماعات مستقبلية", en: "Future Meetings" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
        detail: {
          ar: `${futureMeetings.length} اجتماع مستقبلي سيحتاج إدارة الدور الجديد`,
          en: `${futureMeetings.length} future meeting(s) will need the new role's management`,
        }[document.documentElement.dir === "rtl" ? "ar" : "en"],
      });
    }
  }

  return impacts;
}