// LIJAN™ — Dr. Hamad demonstration experience.
//
// A guided journey: what needs the user's intervention now, then the institutional
// organizations that hold his committees — each organization reveals its own committees
// when opened, and the role filter orders them by his role in each committee.
// Identity, the single primary organization, the committees and their owning / represented
// organizations are all resolved by GetDrHamadExperience from the persisted persona records.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import EmptyState from "@/components/raqeem/EmptyState";
import OrganizationIdentity from "@/components/raqeem/OrganizationIdentity";
import AgentChatPanel from "@/components/raqeem/AgentChatPanel";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import { WorkspaceSkeleton } from "@/components/raqeem/LoadingSkeleton";
import NextStepJourney from "@/components/demo/NextStepJourney";
import RoleFilterBar from "@/components/demo/RoleFilterBar";
import OrganizationGroup from "@/components/demo/OrganizationGroup";

export default function DrHamadExperience() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { demoPersonaKey, isDemoMode } = useEffectiveActor();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleFilter, setRoleFilter] = useState("all");

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

  const { profile, summary, sections, role_labels: roleLabels, primary_org: primaryOrg } = data;
  const allCommittees = (sections || []).flatMap((s) => s.committees || []);

  const openCommittee = (c) => navigate(`/o/${c.owning_org?.public_id}/c/${c.public_id}`);

  if (isDemoMode && allCommittees.length === 0) {
    return <EmptyState icon={Building2} title={t("لا توجد عضويات لجان", "No committee memberships")} description={t("تعذّر تحميل عضويات هذه الشخصية.", "This persona's memberships could not be loaded.")} />;
  }

  const visibleSections = (sections || [])
    .map((s) => ({
      ...s,
      committees: (s.committees || []).filter((c) => roleFilter === "all" || c.role === roleFilter),
    }))
    .filter((s) => s.committees.length > 0);

  return (
    <div className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* One person · one account · one permanent organization */}
      <div className="raqeem-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground">
              {t(`مرحبًا، ${profile.name_ar}`, `Welcome, ${profile.name_en}`)}
            </h1>
            <div className="mt-1.5">
              <OrganizationIdentity
                org={primaryOrg || { name_ar: profile.primary_org_ar, name_en: profile.primary_org_en }}
                size="row"
                nameClassName="text-[11px] font-semibold text-primary"
              />
            </div>
          </div>
          <AgentChatPanel variant="inline" />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">{t(summary.ar, summary.en)}</p>
      </div>

      {/* What needs intervention now */}
      <NextStepJourney committees={allCommittees} onOpen={openCommittee} />

      {/* Order by role */}
      <RoleFilterBar
        committees={allCommittees}
        roleLabels={roleLabels}
        value={roleFilter}
        onChange={setRoleFilter}
      />

      {/* Organizations, each holding its own committees */}
      {visibleSections.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("لا توجد لجان بهذا الدور", "No committees in this role")}
          description={t("اختر دورًا آخر من شريط الترتيب.", "Choose another role from the filter bar.")}
        />
      ) : (
        visibleSections.map((section) => (
          <OrganizationGroup
            key={section.key}
            section={section}
            committees={section.committees}
            onOpen={openCommittee}
          />
        ))
      )}

      <PoweredByConnection variant="dark" />
    </div>
  );
}