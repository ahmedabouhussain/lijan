import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { L } from "@/lib/l10n";
import { MEMBER_ROLE } from "@/lib/raqeemUtils";
import PageHeader from "@/components/raqeem/PageHeader";
import { base44 } from "@/api/base44Client";
import { History, Loader2, ChevronDown, ChevronUp, Users, Crown, GitCompare } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { Button } from "@/components/ui/button";
import FormationDiff from "@/components/raqeem/FormationDiff";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";

export default function FormationHistory() {
  const { data } = useCommittee();
  const { getTitle } = usePageConfig("formation-history");
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [compareMode, setCompareMode] = useState(false);
  const [selA, setSelA] = useState(null);
  const [selB, setSelB] = useState(null);

  const load = async () => {
    if (!data?.committee) return;
    setLoading(true);
    try {
      const res = await base44.entities.CommitteeFormationVersion.filter({
        committee_id: data.committee.id,
      }, "-version_number", 50);
      setVersions(res || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [data?.committee?.id]);

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  if (!data) return <TableSkeleton rows={4} />;

  const current = versions.find((v) => v.is_current);

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        icon={History}
        title={getTitle("سجل التشكيل", "Formation Register")}
        actions={versions.length >= 2 && (
          <Button size="sm" variant={compareMode ? "default" : "outline"} onClick={() => { setCompareMode((c) => !c); setSelA(null); setSelB(null); }} className="inline-flex items-center gap-1.5">
            <GitCompare className="w-4 h-4" aria-hidden="true" /> {compareMode ? "إنهاء المقارنة" : "مقارنة النسخ"}
          </Button>
        )}
      />

      {/* Comparison panel */}
      {compareMode && selA && selB && (
        <FormationDiff versionA={versions.find((v) => v.id === selA)} versionB={versions.find((v) => v.id === selB)} />
      )}

      {/* Current formation */}
      {current && (
        <div className="raqeem-card p-4 space-y-2 border-r-4 border-r-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">التشكيل الحالي · نسخة #{current.version_number}</span>
            </div>
            <StatusBadge label={L.pair("نافذ", "In force")} colorClass="bg-state-success-surface text-state-success-ink" />
          </div>
          <div className="text-xs text-muted-foreground">
            نافذ من {current.effective_date}
            {current.source_instrument_ref ? ` · السند: ${current.source_instrument_ref}` : ""}
            {current.reason_for_change ? ` · ${current.reason_for_change}` : ""}
          </div>
          <div className="text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5 inline" /> {current.member_count} أعضاء
            {current.chair_name ? ` · الرئيس: ${current.chair_name}` : ""}
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : versions.length === 0 ? (
        <div className="raqeem-card p-6 text-center text-sm text-muted-foreground">
          لا توجد نسخ تشكيل مسجَّلة. يتم إنشاء نسخة تلقائيًا عند أول تغيير محوَّك.
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => {
            const members = v.formation_snapshot ? JSON.parse(v.formation_snapshot) : [];
            const isOpen = expanded[v.id];
            return (
              <div key={v.id} className="raqeem-card p-3">
                <div className="flex items-center gap-2">
                  {compareMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelA((s) => (s === v.id ? null : v.id))}
                        className={`w-7 h-7 rounded text-xs font-bold border transition-colors ${
                          selA === v.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                        }`}
                      >A</button>
                      <button
                        onClick={() => setSelB((s) => (s === v.id ? null : v.id))}
                        className={`w-7 h-7 rounded text-xs font-bold border transition-colors ${
                          selB === v.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                        }`}
                      >B</button>
                    </div>
                  )}
                  <button
                    onClick={() => !compareMode && toggle(v.id)}
                    disabled={compareMode}
                    className="flex-1 flex items-center justify-between text-right"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        نسخة #{v.version_number}
                        {v.is_current && <span className="text-state-success-ink mx-2">· {L.pair("الحالية", "Current")}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {v.effective_date} → {v.end_date || "الآن"}
                        {v.member_count ? ` · ${v.member_count} أعضاء` : ""}
                      </div>
                    </div>
                    {!compareMode && (isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-3 space-y-2">
                    {v.reason_for_change && (
                      <div className="text-xs text-muted-foreground">سبب التغيير: {v.reason_for_change}</div>
                    )}
                    {v.source_instrument_ref && (
                      <div className="text-xs text-muted-foreground">السند: {v.source_instrument_ref}</div>
                    )}
                    {v.approving_authority && (
                      <div className="text-xs text-muted-foreground">جهة الاعتماد: {v.approving_authority}</div>
                    )}
                    <div className="divide-y divide-border">
                      {members.map((m, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                          <span>{L.name(m, "full_name")}</span>
                          <span className="text-muted-foreground">{L.label(MEMBER_ROLE, m.role, m.role)}</span>
                        </div>
                      ))}
                      {members.length === 0 && <div className="text-xs text-muted-foreground py-2">{L.pair("لا أعضاء في هذه النسخة", "No members in this version")}</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}