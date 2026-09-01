import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { ShieldCheck } from "lucide-react";

export default function CommitteeAudit() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!data?.committee?.id) return;
    base44.entities.AuditEvent.filter({ committee_id: data.committee.id })
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [data?.committee?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("سجل تدقيق اللجنة", "Committee Audit Trail")}</h1>
        <span className="text-sm text-muted-foreground">({events.length})</span>
      </div>

      {events.length === 0 ? (
        <div className="raqeem-card p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد أحداث تدقيق", "No audit events")}</p>
        </div>
      ) : (
        <div className="raqeem-card divide-y divide-border">
          {events.slice(0, 50).map((e) => (
            <div key={e.id} className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{e.action || e.description}</span>
                <span className="text-xs text-muted-foreground">{new Date(e.created_date || e.timestamp).toLocaleDateString("ar")}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{e.actor_name || "—"} · {e.entity_type || ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}