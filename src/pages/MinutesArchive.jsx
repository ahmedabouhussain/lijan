import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Archive, MessageSquareText } from "lucide-react";
import DeliberationCard from "@/components/raqeem/DeliberationCard";
import DeliberationFormDialog from "@/components/raqeem/DeliberationFormDialog";
import EmptyState from "@/components/raqeem/EmptyState";

export default function MinutesArchive() {
  const [deliberations, setDeliberations] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCommittee, setFilterCommittee] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const orgs = await base44.entities.Organization.list();
      if (!orgs || orgs.length === 0) {
        setLoading(false);
        return;
      }
      setOrganizations(orgs);
      const me = await base44.auth.me();
      if (!me.data?.active_org_id) {
        await base44.auth.updateMe({ data: { active_org_id: orgs[0].id } });
      }
      const [dels, coms, decs] = await Promise.all([
        base44.entities.Deliberation.list("-deliberated_at", 100),
        base44.entities.Committee.list(),
        base44.entities.Decision.list(),
      ]);
      setDeliberations(dels || []);
      setCommittees(coms || []);
      setDecisions(decs || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const committeeMap = useMemo(() => {
    const map = {};
    (committees || []).forEach((c) => { map[c.id] = c; });
    return map;
  }, [committees]);

  const decisionMap = useMemo(() => {
    const map = {};
    (decisions || []).forEach((d) => { map[d.id] = d; });
    return map;
  }, [decisions]);

  const orgMap = useMemo(() => {
    const map = {};
    (organizations || []).forEach((o) => { map[o.id] = o; });
    return map;
  }, [organizations]);

  const filtered = useMemo(() => {
    if (filterCommittee === "all") return deliberations;
    return deliberations.filter((d) => d.committee_id === filterCommittee);
  }, [deliberations, filterCommittee]);

  async function handleCreateDeliberation(data) {
    const created = await base44.entities.Deliberation.create(data);
    setDeliberations((prev) => [created, ...prev]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
              <Archive className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">سجل المداولات</h1>
              <p className="text-sm text-muted-foreground">أرشيف نقاشات اللجان ومداولاتها المرتبطة بالقرارات</p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            مداولة جديدة
          </Button>
        </div>

        {/* Filter */}
        {committees.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">تصفية حسب اللجنة:</span>
            <Select value={filterCommittee} onValueChange={setFilterCommittee}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع اللجان</SelectItem>
                {committees.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name_ar || c.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title="لا توجد مداولات مسجلة"
            description="ابدأ بتسجيل مداولات اللجنة لضمان توثيق النقاشات وربطها بالقرارات لتحقيق الشفافية"
            action={
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                تسجيل مداولة
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((d) => {
              const committee = committeeMap[d.committee_id];
              const decision = decisionMap[d.decision_id];
              const org = orgMap[committee?.organization_id];
              const decisionLink = org && committee && d.decision_id
                ? `/o/${org.slug}/c/${committee.slug}/decisions/${d.decision_id}`
                : null;
              return (
                <DeliberationCard
                  key={d.id}
                  deliberation={d}
                  committeeName={committee?.name_ar || committee?.name_en}
                  decisionTitle={decision?.title || decision?.title_ar || decision?.decision_number}
                  decisionLink={decisionLink}
                />
              );
            })}
          </div>
        )}
      </div>

      <DeliberationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        committees={committees}
        committeeMap={committeeMap}
        onSubmit={handleCreateDeliberation}
      />
    </div>
  );
}