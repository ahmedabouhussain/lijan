import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import SovereignCard, { TaskCard } from "@/components/raqeem/SovereignCard";
import {
  Gavel, CalendarClock, Vote, FileSignature, AlertTriangle,
  FileText, Clock, CheckCircle2, Inbox, ChevronLeft,
} from "lucide-react";

/**
 * WorkInbox — «ما المطلوب مني الآن؟»
 * Calm Sovereign Intelligence: 3 sections (الآن، قريبًا، يحتاج انتباهًا).
 * Max 5 cards in "الآن". Quiet state when empty.
 */
export default function WorkInbox({ data, base }) {
  const { t, lang } = useLanguage();
  if (!data) return null;

  const { committee, my_role, meetings, registers } = data;
  const now = new Date();

  // --- Section 1: الآن (Action needed now) ---
  const nowItems = [];

  // Decisions pending approval (chair/vice_chair)
  const pendingDecisions = (registers?.decisions || []).filter(
    (d) => d.status === "pending_approval" || d.status === "draft"
  );
  if (["chair", "vice_chair"].includes(my_role) && pendingDecisions.length > 0) {
    const d = pendingDecisions[0];
    nowItems.push({
      icon: Gavel,
      title: t("قرار يحتاج اعتمادك", "Decision Awaiting Your Approval"),
      reason: t("مسودة قرار جاهزة لمراجعتك واعتمادها", "A decision draft is ready for your review and approval"),
      committee: committee.name_ar || committee.name_en,
      priority: "high",
      actionLabel: t("مراجعة القرار", "Review Decision"),
      to: `${base}/decisions/${d.id}`,
    });
  }

  // Pending votes
  const openVotes = (registers?.votes || []).filter((v) => v.status === "open");
  if (openVotes.length > 0) {
    nowItems.push({
      icon: Vote,
      title: t("تصويت معلق", "Pending Vote"),
      reason: t("تصويت مفتوح ينتظر صوتك", "An open vote is waiting for your ballot"),
      committee: committee.name_ar || committee.name_en,
      priority: "urgent",
      actionLabel: t("التصويت الآن", "Vote Now"),
      to: `${base}/voting`,
    });
  }

  // Pending signatures
  const pendingSignatures = (registers?.signatures || []).filter((s) => !s.signed_at);
  if (pendingSignatures.length > 0) {
    nowItems.push({
      icon: FileSignature,
      title: t("توقيع معلق", "Pending Signature"),
      reason: t("وثيقة تنتظر توقيعك الرسمي", "A document awaits your official signature"),
      committee: committee.name_ar || committee.name_en,
      priority: "high",
      actionLabel: t("توقيع", "Sign"),
      to: `${base}/signatures`,
    });
  }

  // Overdue actions assigned to me
  const overdueActions = (registers?.actions || []).filter((a) => {
    if (!a.deadline || a.status === "closed") return false;
    return new Date(a.deadline) < now;
  });
  if (overdueActions.length > 0) {
    const a = overdueActions[0];
    nowItems.push({
      icon: AlertTriangle,
      title: t("إجراء متأخر", "Overdue Action"),
      reason: t("إجراء تجاوز موعده النهائي", "An action has passed its deadline"),
      committee: committee.name_ar || committee.name_en,
      deadline: a.deadline ? new Date(a.deadline).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US") : null,
      priority: "urgent",
      actionLabel: t("معالجة الإجراء", "Address Action"),
      to: `${base}/actions`,
    });
  }

  // Documents/reports needing review
  const pendingReview = (registers?.documents || []).filter((d) => d.status === "in_review");
  if (pendingReview.length > 0) {
    nowItems.push({
      icon: FileText,
      title: t("مستند يحتاج مراجعتك", "Document Needs Your Review"),
      reason: t("وثيقة بانتظار مراجعتك قبل الإصدار", "A document awaits your review before publication"),
      committee: committee.name_ar || committee.name_en,
      priority: "normal",
      actionLabel: t("مراجعة", "Review"),
      to: `${base}/documents`,
    });
  }

  // Cap at 5
  const nowItemsCapped = nowItems.slice(0, 5);

  // --- Section 2: قريبًا (Upcoming) ---
  const upcoming = (meetings?.upcoming || []).slice(0, 3);

  // --- Section 3: يحتاج انتباهًا (Needs attention) ---
  const attentionItems = [];

  // Quorum risk
  if (upcoming.length > 0 && (data.members?.length || 0) < (committee.quorum_count || 3)) {
    attentionItems.push({
      icon: AlertTriangle,
      title: t("خطر النصاب", "Quorum Risk"),
      reason: t("الاجتماع القادم قد لا يكتمل نصابه", "Next meeting may not reach quorum"),
    });
  }

  // Pack not ready
  const nextMeeting = upcoming[0];
  if (nextMeeting && !nextMeeting.agenda_ready) {
    const daysUntil = Math.ceil((new Date(nextMeeting.date) - now) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 3 && daysUntil > 0) {
      attentionItems.push({
        icon: FileText,
        title: t("تأخر إعداد الحزمة", "Pack Preparation Delay"),
        reason: t(`الاجتماع خلال ${daysUntil} أيام`, `Meeting in ${daysUntil} days`),
      });
    }
  }

  // Member term expiry
  const expiringMembers = (data.members || []).filter((m) => {
    if (!m.term_end) return false;
    const days = Math.ceil((new Date(m.term_end) - now) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 30;
  });
  if (expiringMembers.length > 0) {
    attentionItems.push({
      icon: Clock,
      title: t("مدد أعضاء تنتهي قريباً", "Member Terms Expiring"),
      reason: t(`${expiringMembers.length} عضو خلال 30 يوماً`, `${expiringMembers.length} members within 30 days`),
    });
  }

  const hasNoItems = nowItemsCapped.length === 0 && upcoming.length === 0 && attentionItems.length === 0;

  if (hasNoItems) {
    return (
      <SovereignCard className="p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("لا توجد إجراءات مطلوبة منك حاليًا", "No actions required from you at this time")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("ستظهر هنا المهام فور الحاجة إليها", "Tasks will appear here as they arise")}
            </p>
          </div>
        </div>
      </SovereignCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section: الآن */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Inbox className="w-4 h-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">{t("الآن", "Now")}</h3>
          {nowItemsCapped.length > 0 && (
            <span className="text-xs text-muted-foreground">({nowItemsCapped.length})</span>
          )}
        </div>
        {nowItemsCapped.length > 0 ? (
          <div className="space-y-3">
            {nowItemsCapped.map((item, i) => (
              <TaskCard key={i} {...item} />
            ))}
          </div>
        ) : (
          <SovereignCard className="p-4">
            <p className="text-xs text-muted-foreground text-center">
              {t("لا توجد إجراءات عاجلة", "No urgent actions")}
            </p>
          </SovereignCard>
        )}
      </section>

      {/* Section: قريبًا */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">{t("قريبًا", "Upcoming")}</h3>
          </div>
          <div className="space-y-3">
            {upcoming.map((m, i) => (
              <SovereignCard key={i} interactive as={Link} to={`${base}/meetings/${m.id}`} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-secondary">
                    <CalendarClock className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-foreground truncate">{m.title || m.title_ar || t("اجتماع", "Meeting")}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.date ? new Date(m.date).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                </div>
              </SovereignCard>
            ))}
          </div>
        </section>
      )}

      {/* Section: يحتاج انتباهًا */}
      {attentionItems.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-primary/70" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">{t("يحتاج انتباهًا", "Needs Attention")}</h3>
          </div>
          <div className="space-y-2">
            {attentionItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <SovereignCard key={i} className="p-3">
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-primary/70 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.reason}</p>
                    </div>
                  </div>
                </SovereignCard>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}