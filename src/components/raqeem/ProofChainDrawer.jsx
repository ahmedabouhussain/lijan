import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { base44 } from "@/api/base44Client";
import {
  ScrollText, Scale, FileText, GitFork, MessageSquare, Vote,
  User, Clock, CheckCircle2, TrendingUp, GitBranch, ShieldCheck,
  Circle, Link2, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ProofChainDrawer™ — Section 4: «عرض سلسلة الإثبات»
 * A calm button that opens a Drawer showing the full governance journey
 * from mandate → meeting → agenda → deliberation → vote → minutes → decision → signature → action → evidence → closure → impact.
 * Not a complex graph — a simple vertical timeline.
 */
export default function ProofChainDrawer({ entityType, entityId, entityTitle, children }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [chain, setChain] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entityId) return;
    setLoading(true);
    buildChain(entityType, entityId).then((c) => {
      setChain(c);
      setLoading(false);
    });
  }, [open, entityId, entityType]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors touch-target sovereign-focus"
      >
        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
        {t("عرض سلسلة الإثبات", "View Proof Chain")}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={lang === "ar" ? "right" : "left"} className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
              {t("سلسلة الإثبات", "Proof Chain")}
            </SheetTitle>
            <SheetDescription>
              {entityTitle || t("الرحلة الكاملة للحوكمة", "Full governance journey")}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-secondary border-t-primary rounded-full animate-spin" />
              </div>
            ) : chain && chain.length > 0 ? (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute top-2 bottom-2 w-0.5 bg-border" style={{ [lang === "ar" ? "right" : "left"]: "15px" }} />
                <div className="space-y-4">
                  {chain.map((step, i) => {
                    const Icon = step.icon || Circle;
                    const has = step.value || step.link;
                    return (
                      <div key={i} className="flex items-start gap-3 relative">
                        <div
                          className={cn(
                            "relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            has ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground/40"
                          )}
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">{step.label}</span>
                            {has ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50">{t("غير مرتبط", "Not linked")}</span>
                            )}
                          </div>
                          {step.detail && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>
                          )}
                          {step.link && (
                            <a
                              href={step.link}
                              className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline mt-1"
                            >
                              {t("فتح", "Open")}
                              <ChevronLeft className="w-3 h-3" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">
                  {t("لا توجد روابط في سلسلة الإثبات", "No links in the proof chain")}
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * Builds the proof chain timeline for a given entity.
 * Each step: { label, icon, value, detail, link }
 */
async function buildChain(entityType, entityId) {
  const chain = [];

  try {
    if (entityType === "Decision") {
      const decision = await base44.entities.Decision.get(entityId).catch(() => null);
      if (!decision) return chain;

      // Committee / Mandate
      if (decision.committee_id) {
        const committee = await base44.entities.Committee.get(decision.committee_id).catch(() => null);
        if (committee) {
          chain.push({
            label: { ar: "اللجنة والصلاحية", en: "Committee & Mandate" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
            icon: ScrollText,
            value: true,
            detail: committee.name_ar || committee.name_en,
            link: null, // internal nav
          });
        }
      }

      // Meeting
      if (decision.meeting_id) {
        const meeting = await base44.entities.Meeting.get(decision.meeting_id).catch(() => null);
        if (meeting) {
          chain.push({
            label: { ar: "الاجتماع", en: "Meeting" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
            icon: FileText,
            value: true,
            detail: meeting.title || meeting.title_ar,
          });
        }
      }

      // Agenda items
      const agendaItems = await base44.entities.AgendaItem.filter({ decision_id: entityId }).catch(() => []);
      if (agendaItems.length > 0) {
        chain.push({
          label: { ar: "بنود جدول الأعمال", en: "Agenda Items" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
          icon: GitFork,
          value: true,
          detail: `${agendaItems.length} ${document.documentElement.dir === "rtl" ? "بند" : "items"}`,
        });
      }

      // Deliberations
      const deliberations = await base44.entities.Deliberation.filter({ decision_id: entityId }).catch(() => []);
      if (deliberations.length > 0) {
        chain.push({
          label: { ar: "المناقشات", en: "Deliberations" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
          icon: MessageSquare,
          value: true,
          detail: `${deliberations.length} ${document.documentElement.dir === "rtl" ? "مداخلة" : "deliberations"}`,
        });
      }

      // Votes
      const votes = await base44.entities.Vote.filter({ decision_id: entityId }).catch(() => []);
      if (votes.length > 0) {
        chain.push({
          label: { ar: "التصويت", en: "Voting" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
          icon: Vote,
          value: true,
          detail: `${votes.length} ${document.documentElement.dir === "rtl" ? "صوت" : "votes"}`,
        });
      }

      // Minutes
      if (decision.meeting_id) {
        const minutes = await base44.entities.MeetingMinutes.filter({ meeting_id: decision.meeting_id }).catch(() => []);
        if (minutes.length > 0) {
          chain.push({
            label: { ar: "المحضر", en: "Minutes" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
            icon: FileText,
            value: true,
            detail: minutes[0].status,
          });
        }
      }

      // Decision itself
      chain.push({
        label: { ar: "القرار", en: "Decision" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
        icon: Scale,
        value: true,
        detail: decision.title,
      });

      // Signatures
      const signatures = await base44.entities.Signature.filter({ source_entity_type: "Decision", source_entity_id: entityId }).catch(() => []);
      if (signatures.length > 0) {
        chain.push({
          label: { ar: "التوقيعات", en: "Signatures" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
          icon: CheckCircle2,
          value: true,
          detail: `${signatures.filter(s => s.signed_at).length}/${signatures.length} ${document.documentElement.dir === "rtl" ? "موقّع" : "signed"}`,
        });
      }

      // Actions
      const actions = await base44.entities.Action.filter({ decision_id: entityId }).catch(() => []);
      if (actions.length > 0) {
        chain.push({
          label: { ar: "إجراءات التنفيذ", en: "Execution Actions" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
          icon: User,
          value: true,
          detail: `${actions.length} ${document.documentElement.dir === "rtl" ? "إجراء" : "actions"}`,
        });
      }

      // Impact
      if (decision.impact) {
        chain.push({
          label: { ar: "الأثر", en: "Impact" }[document.documentElement.dir === "rtl" ? "ar" : "en"],
          icon: TrendingUp,
          value: true,
          detail: decision.impact.substring(0, 80),
        });
      }
    }
  } catch {
    // graceful — return what we have
  }

  return chain;
}