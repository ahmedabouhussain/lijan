import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import SovereignCard from "@/components/raqeem/SovereignCard";
import { ClipboardCheck, AlertCircle, FileText, UserCheck } from "lucide-react";

/**
 * SecretaryOperationsView — calm operational strip for the secretary.
 * Shows: next meeting readiness, gaps, pending items — all processable in place.
 * Not a full dashboard — a focused strip that complements the WorkInbox.
 */
export default function SecretaryOperations({ data, base }) {
  const { t } = useLanguage();
  if (!data) return null;

  const { my_role, meetings, registers } = data;
  if (my_role !== "secretary") return null;

  const upcoming = meetings?.upcoming || [];
  const nextMeeting = upcoming[0];
  
  // Calculate readiness gaps for next meeting
  const gaps = [];
  if (nextMeeting) {
    if (!nextMeeting.agenda_ready) {
      gaps.push({ icon: FileText, label: t("جدول الأعمال غير جاهز", "Agenda not ready") });
    }
    const pendingDocs = (registers?.documents || []).filter(
      (d) => d.status === "draft" || d.status === "in_review"
    );
    if (pendingDocs.length > 0) {
      gaps.push({ icon: FileText, label: t(`${pendingDocs.length} وثائق منتظرة`, `${pendingDocs.length} pending documents`) });
    }
    const pendingMinutes = (registers?.minutes || []).filter(
      (m) => m.status === "draft" || m.status === "pending_approval"
    );
    if (pendingMinutes.length > 0) {
      gaps.push({ icon: ClipboardCheck, label: t(`${pendingMinutes.length} محاضر منتظرة`, `${pendingMinutes.length} minutes pending`) });
    }
    const pendingSignatures = (registers?.signatures || []).filter((s) => !s.signed_at);
    if (pendingSignatures.length > 0) {
      gaps.push({ icon: UserCheck, label: t(`${pendingSignatures.length} توقيع معلق`, `${pendingSignatures.length} pending signatures`) });
    }
  }

  if (!nextMeeting && gaps.length === 0) return null;

  return (
    <SovereignCard className="p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/5">
          <ClipboardCheck className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("الجاهزية التشغيلية", "Operational Readiness")}
          </p>
          <p className="text-sm font-semibold text-foreground">
            {nextMeeting
              ? nextMeeting.title || nextMeeting.title_ar || t("الاجتماع القادم", "Next Meeting")
              : t("لا اجتماعات قادمة", "No upcoming meetings")}
          </p>
        </div>
      </div>

      {gaps.length > 0 ? (
        <div className="space-y-1.5">
          {gaps.slice(0, 4).map((gap, i) => {
            const Icon = gap.icon;
            return (
              <Link
                key={i}
                to={base}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-xs text-foreground sovereign-focus"
              >
                <Icon className="w-3.5 h-3.5 text-primary/70 shrink-0" aria-hidden="true" />
                <span className="flex-1">{gap.label}</span>
                <AlertCircle className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground px-2.5 py-2">
          {t("الاجتماع جاهز، لا توجد نواقص", "Meeting is ready, no gaps")}
        </p>
      )}
    </SovereignCard>
  );
}