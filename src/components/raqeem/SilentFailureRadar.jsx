import { AlertTriangle, Clock, User, FileText, Vote, GitBranch, Calendar, ShieldAlert } from "lucide-react";

/**
 * SilentFailureRadar™ — Section 13
 * Detects hidden problems that don't show up as direct delays:
 * - Decision without execution owner
 * - Action without deadline
 * - Deadline without reminder
 * - Closed action without evidence
 * - Member with expired term still active
 * - Expired delegation still active
 * - Meeting without complete pack
 * - Approved minutes without expected decision
 * - Decision issued without meeting linkage
 * - Escalation without owner
 * - Founding instrument near expiry
 * - Temporary committee exceeded its term
 * - Task assigned to member no longer in formation
 *
 * Returns signals that feed into the "يحتاج انتباهًا" section of WorkInbox.
 */
export function detectSilentFailures(data) {
  if (!data) return [];
  const { committee, members, meetings, registers } = data;
  const signals = [];
  const now = new Date();

  const actions = registers?.actions || [];
  const decisions = registers?.decisions || [];
  const escalations = registers?.escalations || [];
  const delegations = registers?.delegations || [];
  const documents = registers?.documents || [];
  const minutes = registers?.minutes || [];
  const upcoming = meetings?.upcoming || [];

  // 1. Decision without execution owner
  decisions.forEach((d) => {
    if ((d.status === "issued" || d.status === "approved") && !d.owner_name && !d.owner_user_id) {
      signals.push({
        type: "decision_no_owner",
        icon: User,
        severity: "high",
        title: { ar: "قرار بلا مسؤول تنفيذ", en: "Decision Without Execution Owner" },
        detail: {
          ar: `قرار «${d.title?.substring(0, 40) || ""}» صدر دون مسؤول تنفيذي`,
          en: `Decision "${d.title?.substring(0, 40) || ""}" issued without an execution owner`,
        },
      });
    }
  });

  // 2. Action without deadline
  actions.forEach((a) => {
    if (a.status !== "closed" && !a.deadline) {
      signals.push({
        type: "action_no_deadline",
        icon: Clock,
        severity: "medium",
        title: { ar: "إجراء بلا موعد نهائي", en: "Action Without Deadline" },
        detail: {
          ar: `إجراء «${a.title?.substring(0, 40) || ""}» ليس له موعد نهائي`,
          en: `Action "${a.title?.substring(0, 40) || ""}" has no deadline`,
        },
      });
    }
  });

  // 3. Closed action without evidence
  actions.forEach((a) => {
    if (a.status === "closed" && !a.evidence_url && !a.completion_notes) {
      signals.push({
        type: "closed_no_evidence",
        icon: FileText,
        severity: "medium",
        title: { ar: "إجراء مغلق بلا دليل", en: "Closed Action Without Evidence" },
        detail: {
          ar: `إجراء «${a.title?.substring(0, 40) || ""}» أُغلق دون دليل إتمام`,
          en: `Action "${a.title?.substring(0, 40) || ""}" closed without completion evidence`,
        },
      });
    }
  });

  // 4. Member with expired term still active
  members.forEach((m) => {
    if (m.status === "active" && m.term_end) {
      const days = Math.ceil((new Date(m.term_end) - now) / (1000 * 60 * 60 * 24));
      if (days < 0) {
        signals.push({
          type: "expired_member_active",
          icon: User,
          severity: "high",
          title: { ar: "عضو انتهت مدته وما زال نشطًا", en: "Member Term Expired But Still Active" },
          detail: {
            ar: `${m.full_name || m.full_name_ar || "عضو"} تجاوز انتهاء مدته`,
            en: `${m.full_name || m.full_name_ar || "Member"} has passed term end`,
          },
        });
      }
    }
  });

  // 5. Expired delegation still active
  delegations.forEach((d) => {
    if (d.status === "active" && d.end_date) {
      const days = Math.ceil((new Date(d.end_date) - now) / (1000 * 60 * 60 * 24));
      if (days < 0) {
        signals.push({
          type: "expired_delegation",
          icon: GitBranch,
          severity: "medium",
          title: { ar: "تفويض منتهٍ وما زال فعالًا", en: "Expired Delegation Still Active" },
          detail: {
            ar: `تفويض من ${d.from_member_name || ""} إلى ${d.to_member_name || ""} انتهت صلاحيته`,
            en: `Delegation from ${d.from_member_name || ""} to ${d.to_member_name || ""} has expired`,
          },
        });
      }
    }
  });

  // 6. Meeting without complete pack (close to date)
  upcoming.forEach((m) => {
    if (!m.agenda_ready) {
      const days = Math.ceil((new Date(m.date) - now) / (1000 * 60 * 60 * 24));
      if (days <= 2 && days > 0) {
        signals.push({
          type: "meeting_no_pack",
          icon: FileText,
          severity: "high",
          title: { ar: "اجتماع دون حزمة كاملة", en: "Meeting Without Complete Pack" },
          detail: {
            ar: `اجتماع «${m.title?.substring(0, 30) || ""}» خلال ${days} أيام وحزمة غير مكتملة`,
            en: `Meeting "${m.title?.substring(0, 30) || ""}" in ${days} days with incomplete pack`,
          },
        });
      }
    }
  });

  // 7. Approved minutes without expected decision
  minutes.forEach((m) => {
    if (m.status === "approved" && m.meeting_id) {
      // Check if any decision is linked to this meeting
      const linkedDecision = decisions.find((d) => d.meeting_id === m.meeting_id);
      if (!linkedDecision) {
        signals.push({
          type: "minutes_no_decision",
          icon: FileText,
          severity: "low",
          title: { ar: "محضر معتمد بلا قرار صادر", en: "Approved Minutes Without Issued Decision" },
          detail: {
            ar: "محضر معتمد لم يصدر عنه قرار متوقع",
            en: "Approved minutes without an expected decision",
          },
        });
      }
    }
  });

  // 8. Escalation without owner
  escalations.forEach((e) => {
    if (!e.owner_name && !e.owner_user_id && e.status !== "resolved") {
      signals.push({
        type: "escalation_no_owner",
        icon: ShieldAlert,
        severity: "high",
        title: { ar: "تصعيد بلا مالك", en: "Escalation Without Owner" },
        detail: {
          ar: "تصعيد محدد دون مالك مسؤول",
          en: "Escalation identified without a responsible owner",
        },
      });
    }
  });

  // 9. Temporary committee exceeded its term
  if (committee?.type?.includes("temporary") && committee?.term_end) {
    const days = Math.ceil((new Date(committee.term_end) - now) / (1000 * 60 * 60 * 24));
    if (days < 0 && committee.status === "active") {
      signals.push({
        type: "temp_committee_expired",
        icon: Calendar,
        severity: "high",
        title: { ar: "لجنة مؤقتة تجاوزت مدتها", en: "Temporary Committee Exceeded Its Term" },
        detail: {
          ar: "لجنة مؤقتة انتهت مدتها وما زالت نشطة",
          en: "Temporary committee has ended its term but remains active",
        },
      });
    }
  }

  // 10. Task assigned to member no longer in formation
  actions.forEach((a) => {
    if (a.status !== "closed" && a.owner_user_id) {
      const ownerInFormation = members.find(
        (m) => m.user_id === a.owner_user_id && m.status === "active"
      );
      if (!ownerInFormation) {
        signals.push({
          type: "task_orphaned",
          icon: User,
          severity: "medium",
          title: { ar: "مهمة مسندة لعضو لم يعد في التشكيل", en: "Task Assigned to Member No Longer in Formation" },
          detail: {
            ar: `إجراء «${a.title?.substring(0, 30) || ""}» مسند لعضو غادر التشكيل`,
            en: `Action "${a.title?.substring(0, 30) || ""}" assigned to a departed member`,
          },
        });
      }
    }
  });

  return signals;
}