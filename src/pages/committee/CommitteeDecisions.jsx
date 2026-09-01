import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS } from "@/lib/raqeemUtils";
import { Gavel, ShieldCheck, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CommitteeDecisions() {
  const { data, reload } = useCommittee();
  const { t } = useLanguage();
  const { orgRef, committeeRef } = useParams();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", proposal: "", legal_basis: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!data) return null;
  const decisions = data.registers.decisions || [];
  const { my_role, is_oversight, is_recused, committee } = data;
  const base = `/o/${orgRef}/c/${committeeRef}`;
  const canCreate = !is_oversight && !is_recused && ["chair", "vice_chair", "secretary", "member"].includes(my_role);

  const issued = decisions.filter((d) => ["issued", "executing", "completed", "closed"].includes(d.status));
  const inProgress = decisions.filter((d) => !["issued", "executing", "completed", "closed", "rejected", "superseded"].includes(d.status));

  const submit = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSubmitting(true); setError("");
    try {
      await base44.functions.invoke("CreateDecisionDraft", { committee_id: committee.id, ...form });
      setShowCreate(false); setForm({ title: "", proposal: "", legal_basis: "" });
      reload();
    } catch (e) { setError(e?.response?.data?.error || e?.message || "Failed"); }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{t("قرارات اللجنة", "Committee Decisions")}</h1>
          <span className="text-sm text-muted-foreground">({decisions.length})</span>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" />
            {t("قرار جديد", "New Decision")}
          </Button>
        )}
      </div>

      {showCreate && (
        <div className="raqeem-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("مسودة قرار", "Decision Draft")}</h3>
            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div><Label>{t("العنوان", "Title")}</Label><Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Approve Digital Health Strategy" /></div>
          <div><Label>{t("المقترح", "Proposal")}</Label><Textarea value={form.proposal} onChange={(e) => setForm(f => ({ ...f, proposal: e.target.value }))} rows={3} /></div>
          <div><Label>{t("الأساس القانوني", "Legal Basis")}</Label><Input value={form.legal_basis} onChange={(e) => setForm(f => ({ ...f, legal_basis: e.target.value }))} placeholder="Ministry Decree 2026/14" /></div>
          <Button onClick={submit} disabled={submitting} className="w-full">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("إنشاء المسودة", "Create Draft")}</Button>
        </div>
      )}

      {/* In-progress decisions */}
      {inProgress.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("قيد المعالجة", "In Progress")}</h3>
          <div className="raqeem-card divide-y divide-border">
            {inProgress.map((d) => (
              <Link key={d.id} to={`${base}/decisions/${d.id}`} className="flex items-center justify-between p-3 hover:bg-secondary/30">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                  {d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}
                </div>
                <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Issued decisions with proof chain indicator */}
      {issued.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t("القرارات الصادرة", "Issued Decisions")}
          </h3>
          <div className="raqeem-card divide-y divide-border">
            {issued.map((d) => (
              <Link key={d.id} to={`${base}/decisions/${d.id}`} className="flex items-center justify-between p-3 hover:bg-secondary/30">
                <div className="min-w-0 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                    {d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}
                  </div>
                </div>
                <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {decisions.length === 0 && (
        <div className="raqeem-card p-8 text-center">
          <Gavel className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد قرارات", "No decisions recorded")}</p>
        </div>
      )}
    </div>
  );
}