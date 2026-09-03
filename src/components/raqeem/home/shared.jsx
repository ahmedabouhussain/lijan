import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ArrowRight } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";

export const GOVERNANCE_ROLES = {
  executive: { ar: "تنفيذي", en: "Executive" },
  chair: { ar: "رئيس لجنة", en: "Chair" },
  secretary: { ar: "أمين لجنة", en: "Secretary" },
  member: { ar: "عضو", en: "Member" },
  auditor: { ar: "مدقق", en: "Auditor" },
};

export function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="raqeem-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${accent || "text-muted-foreground"}`} />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

export function SectionCard({ icon: Icon, title, to, toLabel, empty, emptyText, children }) {
  return (
    <div className="raqeem-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {to && (
          <Link to={to} className="text-xs text-primary hover:underline flex items-center gap-1">
            {toLabel || "عرض الكل"} <ChevronLeft className="w-3 h-3" />
          </Link>
        )}
      </div>
      {empty ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{emptyText || "لا توجد عناصر"}</p>
      ) : (
        children
      )}
    </div>
  );
}

export function AttentionItem({ title, subtitle, badge, to }) {
  return (
    <Link to={to || "#"} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-secondary/50 -mx-2 px-2 rounded-md transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</div>}
      </div>
      {badge}
      <ArrowRight className="w-4 h-4 text-muted-foreground rotate-180 shrink-0" />
    </Link>
  );
}

export function CountBadge({ count, colorClass }) {
  if (count === 0) return null;
  return (
    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${colorClass || "bg-primary/10 text-primary"}`}>
      {count}
    </span>
  );
}

export function useGovernanceData() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const user = await base44.auth.me();
        let institution = null;

        const pending = localStorage.getItem("raqeem_pending_entity");
        if (pending) {
          const entity = JSON.parse(pending);
          const existing = await base44.entities.Institution.filter({ name_en: entity.en }).catch(() => []);
          let inst = existing && existing[0];
          if (!inst) {
            inst = await base44.entities.Institution.create({
              name_ar: entity.ar,
              name_en: entity.en,
              type: entity.category === "holding" ? "organization" : entity.category === "ministry" ? "ministry" : "authority",
              status: "active",
            });
          }
          await base44.auth.updateMe({ institution_id: inst.id });
          localStorage.removeItem("raqeem_pending_entity");
          institution = inst;
        } else if (user?.institution_id) {
          institution = await base44.entities.Institution.get(user.institution_id).catch(() => null);
        }

        const [committees, members, meetings, agendaItems, decisions, actions, auditLogs] = await Promise.all([
          base44.entities.Committee.list().catch(() => []),
          base44.entities.CommitteeMembership.list().catch(() => []),
          base44.entities.Meeting.list().catch(() => []),
          base44.entities.AgendaItem.list().catch(() => []),
          base44.entities.Decision.list().catch(() => []),
          base44.entities.Action.list().catch(() => []),
          base44.entities.AuditLog.list().catch(() => []),
        ]);

        setData({
          user,
          institution,
          committees: committees || [],
          members: members || [],
          meetings: meetings || [],
          agendaItems: agendaItems || [],
          decisions: decisions || [],
          actions: actions || [],
          auditLogs: auditLogs || [],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { loading, ...data };
}