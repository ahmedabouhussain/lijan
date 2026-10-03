// LIJAN™ — Dr. Hamad demonstration experience (§13 landing + §6 contextual sections).
// Everything on this surface is resolved by GetDrHamadExperience from the persisted
// persona records: one primary organization, three institutional contexts, seven scoped
// committee memberships and the current role. Nothing is inferred locally.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Users, Crown, Pen, User, AlertTriangle, FileText, CheckSquare,
  CalendarClock, ChevronLeft, Loader2, Sparkles, Gauge, Globe2, Building,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import { WorkspaceSkeleton } from "@/components/raqeem/LoadingSkeleton";
import AgentChatPanel from "@/components/raqeem/AgentChatPanel";
import { cn } from "@/lib/utils";

const ROLE_ICONS = { chair: Crown, vice_chair: Crown, secretary: Pen, member: User };

const CONTEXT_ICONS = { QDB: Building, NATIONAL: Globe2, ELAN: Building2 };

function formatDate(value, lang) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(lang === "ar" ? "ar-QA" : "en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return null;
  }
}

export default function DrHamadExperience() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { demoPersonaKey, isDemoMode } = useEffectiveActor();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAttention, setShowAttention] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("GetDrHamadExperience", {
          demo_mode: true,
          demo_persona_key: demoPersonaKey,
        });
        if (cancelled) return;
        const d = res?.data || res;
        if (d?.error) setError(d.error);
        else setData(d);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.error || e?.message || t("تعذّر التحميل", "Failed to load"));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [demoPersonaKey]);

  if (loading) return <WorkspaceSkeleton />;
  if (error || !data) {
    return <EmptyState icon={AlertTriangle} title={t("تعذّر تحميل تجربة العرض", "Failed to load the exploration experience")} description={error} />;
  }

  const { profile, summary, sections, role_tally_copy, role_labels } = data;
  const allCommittees = (sections || []).flatMap((s) => s.committees || []);
  const attentionList = allCommittees
    .filter((c) => (c.indicators?.items_needing_attention || 0) > 0)
    .sort((a, b) => (b.indicators?.items_needing_attention || 0) - (a.indicators?.items_needing_attention || 0));
  const docsTarget = [...allCommittees].sort((a, b) => (b.indicators?.unread_documents || 0) - (a.indicators?.unread_documents || 0))[0];

  const openCommittee = (c) => navigate(`/o/${c.owning_org?.public_id}/c/${c.public_id}`);

  if (isDemoMode && allCommittees.length === 0) {
    return <EmptyState icon={Building2} title={t("لا توجد عضويات لجان", "No committee memberships")} description={t("تعذّر تحميل عضويات هذه الشخصية.", "This persona's memberships could not be loaded.")} />;
  }

  const quickAction = (label, icon, onClick) => (
    <button
      key={label}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Identity + primary organization */}
      <div className="raqeem-card p-5">
        <h1 className="text-xl font-bold text-foreground">
          {t(`مرحبًا، ${profile.name_ar}`, `Welcome, ${profile.name_en}`)}
        </h1>
        <p className="text-sm font-semibold text-primary mt-1">{lang === "ar" ? profile.primary_org_ar : profile.primary_org_en}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {lang === "ar" ? profile.job_title_ar : profile.job_title_en}
          {profile.job_title_is_demo_wording && (
            <span className="ms-1.5 text-[10px] text-accent">
              ({t("صياغة عرض تجريبي", "demonstration wording")})
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {t(
            "تعمل عبر 7 لجان وطنية ومؤسسية بأدوار مختلفة. يعرض لك «أمين» ما يحتاج إلى انتباهك وفق اللجنة والدور الحالي.",
            "You work across 7 national and institutional committees in different roles. «Ameen» shows what needs your attention based on the current committee and role."
          )}
        </p>
        <p className="text-[11px] text-accent mt-2">
          {t(profile.account_classification_ar, profile.account_classification_en)}
        </p>

        {/* Experience summary + role tally */}
        <div className="mt-4 pt-3 border-t border-border space-y-2">
          <p className="text-xs font-medium text-foreground">{t(summary.ar, summary.en)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(lang === "ar" ? role_tally_copy.ar : role_tally_copy.en).map((line) => (
              <span key={line} className="text-[11px] text-muted-foreground">• {line}</span>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {quickAction(
            t("عرض ما يحتاج انتباهي", "Show what needs my attention"),
            <AlertTriangle className="w-3.5 h-3.5 text-accent" />,
            () => setShowAttention((v) => !v)
          )}
          {quickAction(
            t("متابعة اللجنة الوطنية", "Follow the National Committee"),
            <Globe2 className="w-3.5 h-3.5 text-accent" />,
            () => {
              const national = allCommittees.find((c) => c.public_id === "DEMO-COMM-NATIONAL-SME");
              if (national) openCommittee(national);
            }
          )}
          {quickAction(
            t("فتح اللجنة التنفيذية", "Open the Executive Committee"),
            <Crown className="w-3.5 h-3.5 text-accent" />,
            () => {
              const elan = allCommittees.find((c) => c.public_id === "DEMO-COMM-ELAN-EXEC");
              if (elan) openCommittee(elan);
            }
          )}
          {quickAction(
            t("مراجعة المستندات", "Review documents"),
            <FileText className="w-3.5 h-3.5 text-accent" />,
            () => { if (docsTarget) navigate(`/o/${docsTarget.owning_org?.public_id}/c/${docsTarget.public_id}/records`); }
          )}
          <AgentChatPanel variant="inline" />
        </div>

        {/* What needs attention — current committee and role only */}
        {showAttention && (
          <div className="mt-4 pt-3 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-foreground">{t("ما يحتاج انتباهي", "What needs my attention")}</p>
            {attentionList.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("لا توجد بنود تحتاج انتباهك حاليًا.", "Nothing needs your attention right now.")}</p>
            ) : (
              attentionList.map((c) => (
                <button
                  key={c.public_id}
                  onClick={() => openCommittee(c)}
                  className="w-full flex items-center justify-between gap-3 text-start px-3 py-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-xs text-foreground truncate">{lang === "ar" ? c.name_ar : c.name_en}</span>
                  <span className="text-[11px] text-accent shrink-0">
                    {c.indicators.items_needing_attention} {t("بند", "items")}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Three contextual sections */}
      {sections.map((section) => {
        const ContextIcon = CONTEXT_ICONS[section.key] || Building2;
        return (
          <div key={section.key} className="raqeem-card overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <ContextIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {lang === "ar" ? section.title_ar : section.title_en}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {section.section_label_ar && section.key === "QDB"
                      ? t(`${section.section_label_ar} (${section.committees.length})`, `${section.section_label_en} (${section.committees.length})`)
                      : (lang === "ar" ? section.name_ar : section.name_en)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {(section.badges || []).map((b) => (
                    <span
                      key={b.en}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        b.tone === "primary" && "bg-primary/10 text-primary border-primary/20",
                        b.tone === "gold" && "bg-accent/10 text-accent border-accent/30",
                        (!b.tone || b.tone === "neutral") && "bg-secondary text-secondary-foreground border-border"
                      )}
                    >
                      {t(b.ar, b.en)}
                    </span>
                  ))}
                </div>
              </div>
              {section.notice_ar && (
                <p className="text-[11px] text-accent mt-2 leading-relaxed">{t(section.notice_ar, section.notice_en)}</p>
              )}
            </div>

            <div className="divide-y divide-border">
              {section.committees.map((c) => {
                const RoleIcon = ROLE_ICONS[c.role] || User;
                const represented = c.owning_org?.public_id !== "DEMO-ORG-QDB";
                const nextMeeting = formatDate(c.indicators?.next_meeting?.date, lang);
                return (
                  <button
                    key={c.public_id}
                    onClick={() => openCommittee(c)}
                    className="w-full text-start px-4 py-3 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {lang === "ar" ? c.name_ar : c.name_en}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {lang === "ar" ? c.owning_org?.name_ar : c.owning_org?.name_en}
                          {represented && ` · ${t("جهة التمثيل", "Representing")}: ${lang === "ar" ? c.represented_org_ar : c.represented_org_en}`}
                        </div>
                        {c.workstream_ar && (
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {lang === "ar" ? c.workstream_ar : c.workstream_en}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/5 text-primary">
                          <RoleIcon className="w-3 h-3" />
                          {lang === "ar" ? c.role_label_ar : c.role_label_en}
                        </span>
                        <StatusBadge
                          label={L.label(COMMITTEE_STATUS, c.status, c.status)}
                          colorClass={COMMITTEE_STATUS[c.status]?.color}
                        />
                        <ChevronLeft className={cn("w-4 h-4 text-muted-foreground", lang === "ar" ? "" : "rotate-180")} />
                      </div>
                    </div>

                    {/* Compact indicators */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-muted-foreground">
                      {nextMeeting && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" />
                          {t("الاجتماع القادم", "Next meeting")}: {nextMeeting}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {t("يحتاج انتباه", "Needs attention")}: {c.indicators?.items_needing_attention ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {t("مستندات", "Documents")}: {c.indicators?.unread_documents ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" />
                        {t("إجراءات معلّقة", "Pending actions")}: {c.indicators?.pending_actions ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {t("جاهزية القرار", "Decision readiness")}: {c.indicators?.decision_readiness === "ready"
                          ? t("جاهز", "Ready")
                          : t("يحتاج استكمالًا", "Needs completion")}
                      </span>
                      <span className="inline-flex items-center gap-1 text-accent">
                        <Sparkles className="w-3 h-3" />
                        {lang === "ar" ? c.classification_label_ar : c.classification_label_en}
                      </span>
                      {c.delegation_required && !c.delegation_active && (
                        <span className="text-destructive">{t("يتطلب تفويضًا نافذًا", "Requires an active delegation")}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <PoweredByConnection variant="dark" />
    </div>
  );
}