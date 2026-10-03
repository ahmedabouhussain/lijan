// LIJAN™ — Context indicator (§10).
// When a committee opens inside the exploration experience, this states the relationship:
// primary organization ← owning organization ← committee ← my current role.
// It EXPLAINS the relationship; it never grants access.

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";

export default function PersonaContextPath() {
  const { committeeRef } = useParams();
  const { lang } = useLanguage();
  const { isDemoMode, demoPersonaKey } = useEffectiveActor();
  const [current, setCurrent] = useState(null);

  const publicId = committeeRef?.split("--").pop() || committeeRef;

  useEffect(() => {
    if (!isDemoMode || !publicId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("GetDrHamadExperience", {
          demo_mode: true,
          demo_persona_key: demoPersonaKey,
          committee_public_id: publicId,
        });
        if (cancelled) return;
        const d = res?.data || res;
        setCurrent(d?.current_context || null);
      } catch {
        if (!cancelled) setCurrent(null);
      }
    })();
    return () => { cancelled = true; };
  }, [isDemoMode, demoPersonaKey, publicId]);

  if (!isDemoMode || !current || current.authorized !== true) return null;

  const path = lang === "ar" ? current.context_path : current.context_path_en;
  const parts = path?.parts || [];
  const roleLabel = lang === "ar" ? current.role_label_ar : current.role_label_en;
  const classification = lang === "ar" ? current.classification_label_ar : current.classification_label_en;

  return (
    <div className="mb-3 rounded-md border border-border bg-secondary/20 px-3 py-2" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {parts.map((part, i) => (
          <React.Fragment key={`${part}-${i}`}>
            {i > 0 && <ChevronLeft className={lang === "ar" ? "w-3 h-3" : "w-3 h-3 rotate-180"} />}
            <span className="text-foreground">{part}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px]">
        {roleLabel && <span className="text-primary font-medium">{roleLabel}</span>}
        {classification && <span className="text-accent">{classification}</span>}
        {current.delegation_required && !current.delegation_active && (
          <span className="text-destructive">
            {lang === "ar" ? "يتطلب تفويضًا نافذًا لممارسة صلاحيات الرئيس" : "Chair powers require an active delegation"}
          </span>
        )}
      </div>
    </div>
  );
}