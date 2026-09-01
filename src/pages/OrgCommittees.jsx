import React from "react";
import { Link, useParams } from "react-router-dom";
import { useOrg } from "@/lib/OrgContext";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { COMMITTEE_STATUS, COMMITTEE_TYPES } from "@/lib/raqeemUtils";
import { Gavel, ChevronLeft, Users } from "lucide-react";

export default function OrgCommittees() {
  const { data } = useOrg();
  const { orgRef } = useParams();
  const { t } = useLanguage();

  if (!data) return null;
  const { committees, my_role } = data;
  const all = [...committees.active, ...committees.draft, ...committees.suspended, ...committees.closing];
  const isAdmin = my_role === "owner" || my_role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("محفظة اللجان", "Committee Portfolio")}</h1>
        <span className="text-sm text-muted-foreground">({all.length})</span>
      </div>

      {all.length === 0 ? (
        <div className="raqeem-card p-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد لجان بعد", "No committees yet")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {all.map((c) => {
            const cRef = `${c.slug || c.id}--${c.public_id || c.id}`;
            return (
              <Link
                key={c.id}
                to={`/o/${orgRef}/c/${cRef}`}
                className="raqeem-card p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{c.name_ar || c.name_en}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.name_en} · {COMMITTEE_TYPES[c.type]?.ar || c.type}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge label={COMMITTEE_STATUS[c.status]?.ar || c.status} colorClass={COMMITTEE_STATUS[c.status]?.color} />
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}