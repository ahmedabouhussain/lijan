import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Sparkles, CheckCircle2, XCircle, Eye, Clock, ShieldCheck, FileText, Gavel, GitCompare, FileClock, AlertTriangle } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { AI_OUTPUT_TYPE, AI_OUTPUT_STATUS, formatDate } from "@/lib/raqeemUtils";

const TYPE_ICONS = {
  meeting_minutes: FileClock,
  governance_doc: ShieldCheck,
  decision_draft: Gavel,
  policy_scenario: GitCompare,
  summary: FileText,
  other: Sparkles,
};

export default function AIOutputLedgerPage() {
  const [entries, setEntries] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewing, setReviewing] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [e, c] = await Promise.all([
        base44.entities.AIOutputLedger.list("-generated_at", 200).catch(() => []),
        base44.entities.Committee.list().catch(() => []),
      ]);
      setEntries(e || []);
      setCommittees(c || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const committeeName = (id) => {
    const c = committees.find((x) => x.id === id);
    return c?.name_ar || c?.name_en || "—";
  };

  const review = async (id, status) => {
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.AIOutputLedger.update(id, {
        status,
        human_reviewed: true,
        approved: status === "approved",
        reviewed_by_name: user?.full_name || user?.email || "—",
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || undefined,
      });
      await base44.entities.AuditLog.create({
        action: status === "approved" ? "approve" : "reject",
        entity_type: "AIOutputLedger",
        entity_id: id,
        description: `مراجعة مخرج ذكاء اصطناعي: ${AI_OUTPUT_STATUS[status]?.ar}`,
      });
      setReviewing(null);
      setReviewNotes("");
      load();
    } catch {}
  };

  const filtered = entries.filter((e) => {
    if (typeFilter !== "all" && e.output_type !== typeFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: entries.length,
    generated: entries.filter((e) => e.status === "generated").length,
    under_review: entries.filter((e) => e.status === "under_review").length,
    approved: entries.filter((e) => e.status === "approved").length,
    rejected: entries.filter((e) => e.status === "rejected").length,
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">جارٍ التحميل...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> سجل مخرجات الذكاء الاصطناعي
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Sovereign AI Output Ledger · تتبع جميع المخرجات المولّدة بالذكاء الاصطناعي مع المراجعة البشرية</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "إجمالي", value: stats.total, icon: Sparkles, color: "text-foreground" },
          { label: "مولّد", value: stats.generated, icon: Clock, color: "text-amber-700" },
          { label: "قيد المراجعة", value: stats.under_review, icon: Eye, color: "text-blue-700" },
          { label: "معتمد", value: stats.approved, icon: CheckCircle2, color: "text-emerald-700" },
          { label: "مرفوض", value: stats.rejected, icon: XCircle, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="raqeem-card p-4">
            <div className="flex items-center gap-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-2xl font-bold">{s.value}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">النوع:</span>
        <button onClick={() => setTypeFilter("all")} className={`text-xs px-3 py-1.5 rounded-md ${typeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>الكل</button>
        {Object.entries(AI_OUTPUT_TYPE).map(([k, v]) => (
          <button key={k} onClick={() => setTypeFilter(k)} className={`text-xs px-3 py-1.5 rounded-md ${typeFilter === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>{v.ar}</button>
        ))}
        <span className="text-xs text-muted-foreground mx-2">الحالة:</span>
        <button onClick={() => setStatusFilter("all")} className={`text-xs px-3 py-1.5 rounded-md ${statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>الكل</button>
        {Object.entries(AI_OUTPUT_STATUS).map(([k, v]) => (
          <button key={k} onClick={() => setStatusFilter(k)} className={`text-xs px-3 py-1.5 rounded-md ${statusFilter === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>{v.ar}</button>
        ))}
      </div>

      {/* Ledger */}
      {filtered.length === 0 ? (
        <EmptyState icon={Sparkles} title="لا توجد مخرجات مسجلة" description="سيظهر هنا سجل جميع المخرجات المولّدة بالذكاء الاصطناعي مع إمكانية المراجعة والاعتماد" />
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const TypeIcon = TYPE_ICONS[e.output_type] || Sparkles;
            return (
              <div key={e.id} className="raqeem-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Type + title */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <TypeIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{e.source_title || AI_OUTPUT_TYPE[e.output_type]?.ar}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{AI_OUTPUT_TYPE[e.output_type]?.ar}</span>
                          {e.committee_id && <span>· {committeeName(e.committee_id)}</span>}
                          {e.model_used && <span>· {e.model_used}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Output summary */}
                    {e.output_summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-10">{e.output_summary}</p>
                    )}

                    {/* Provenance */}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-10">
                      <span>توليد: {formatDate(e.generated_at)}</span>
                      {e.generated_by_name && <span>بواسطة: {e.generated_by_name}</span>}
                      {e.human_reviewed && e.reviewed_by_name && (
                        <span className="text-emerald-700">مراجعة: {e.reviewed_by_name}</span>
                      )}
                    </div>

                    {/* Review notes */}
                    {e.review_notes && (
                      <div className="pl-10">
                        <div className="text-[10px] text-muted-foreground italic bg-secondary/50 rounded p-2">{e.review_notes}</div>
                      </div>
                    )}
                  </div>

                  {/* Status + actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge label={AI_OUTPUT_STATUS[e.status]?.ar} colorClass={AI_OUTPUT_STATUS[e.status]?.color} />
                    {reviewing === e.id ? (
                      <div className="space-y-1.5 w-48">
                        <textarea
                          value={reviewNotes}
                          onChange={(ev) => setReviewNotes(ev.target.value)}
                          placeholder="ملاحظات المراجعة..."
                          className="w-full text-xs p-2 rounded border border-input bg-background resize-none"
                          rows={2}
                        />
                        <div className="flex items-center gap-1">
                          <button onClick={() => review(e.id, "approved")} className="text-[10px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> اعتماد
                          </button>
                          <button onClick={() => review(e.id, "rejected")} className="text-[10px] px-2 py-1 rounded bg-red-50 text-destructive hover:bg-red-100 inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> رفض
                          </button>
                          <button onClick={() => { setReviewing(null); setReviewNotes(""); }} className="text-[10px] px-2 py-1 rounded text-muted-foreground hover:text-foreground">إلغاء</button>
                        </div>
                      </div>
                    ) : (
                      !e.human_reviewed && (
                        <button onClick={() => setReviewing(e.id)} className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" /> مراجعة
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}