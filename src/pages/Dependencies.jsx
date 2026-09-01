import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, X, ArrowRight, GitBranch, AlertTriangle, CheckCircle2, Clock, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { DEPENDENCY_TYPE, DEPENDENCY_STATUS } from "@/lib/raqeemUtils";

export default function Dependencies() {
  const [deps, setDeps] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    source_entity_type: "Decision",
    source_id: "",
    source_title: "",
    source_committee_id: "",
    target_entity_type: "Decision",
    target_id: "",
    target_title: "",
    target_committee_id: "",
    dependency_type: "requires",
    notes: "",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function load() {
    setLoading(true);
    try {
      const [d, c, decs] = await Promise.all([
        base44.entities.CrossEntityDependency.list("-created_date", 200).catch(() => []),
        base44.entities.Committee.list().catch(() => []),
        base44.entities.Decision.list("-created_date", 100).catch(() => []),
      ]);
      setDeps(d || []);
      setCommittees(c || []);
      setDecisions(decs || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const committeeName = (id) => {
    const c = committees.find((x) => x.id === id);
    return c?.name_ar || c?.name_en || "—";
  };

  const create = async () => {
    if (!form.source_id || !form.target_id) return;
    setSaving(true);
    try {
      const srcDec = decisions.find((d) => d.id === form.source_id);
      const tgtDec = decisions.find((d) => d.id === form.target_id);
      const payload = {
        ...form,
        source_title: srcDec?.title || form.source_title,
        source_committee_id: srcDec?.committee_id || form.source_committee_id,
        target_title: tgtDec?.title || form.target_title,
        target_committee_id: tgtDec?.committee_id || form.target_committee_id,
        status: "pending",
      };
      await base44.entities.CrossEntityDependency.create(payload);
      await base44.entities.AuditLog.create({
        action: "create",
        entity_type: "CrossEntityDependency",
        entity_title: `${payload.source_title} → ${payload.target_title}`,
        description: "إنشاء تبعية بين الجهات",
      });
      setForm({ source_entity_type: "Decision", source_id: "", source_title: "", source_committee_id: "", target_entity_type: "Decision", target_id: "", target_title: "", target_committee_id: "", dependency_type: "requires", notes: "" });
      setShowForm(false);
      load();
    } catch {}
    setSaving(false);
  };

  const changeStatus = async (id, status) => {
    try {
      await base44.entities.CrossEntityDependency.update(id, { status });
      await base44.entities.AuditLog.create({
        action: "status_change",
        entity_type: "CrossEntityDependency",
        entity_id: id,
        new_value: status,
        description: `تحديث حالة التبعية إلى ${DEPENDENCY_STATUS[status]?.ar}`,
      });
      load();
    } catch {}
  };

  const remove = async (id) => {
    try {
      await base44.entities.CrossEntityDependency.delete(id);
      load();
    } catch {}
  };

  const filtered = filter === "all" ? deps : deps.filter((d) => d.status === filter);
  const stats = {
    total: deps.length,
    pending: deps.filter((d) => d.status === "pending").length,
    active: deps.filter((d) => d.status === "active").length,
    resolved: deps.filter((d) => d.status === "resolved").length,
    broken: deps.filter((d) => d.status === "broken").length,
  };

  // Build committee-pair map for the constellation
  const pairs = {};
  deps.forEach((d) => {
    const key = `${d.source_committee_id}→${d.target_committee_id}`;
    if (!pairs[key]) pairs[key] = { source: d.source_committee_id, target: d.target_committee_id, count: 0, types: new Set() };
    pairs[key].count++;
    pairs[key].types.add(d.dependency_type);
  });

  const selectClass = "w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">جارٍ التحميل...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" /> التنسيق بين الجهات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-Entity Orchestration · تتبع التبعيات بين القرارات والإجراءات عبر اللجان</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> تبعية جديدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "إجمالي", value: stats.total, icon: GitBranch, color: "text-foreground" },
          { label: "بانتظار", value: stats.pending, icon: Clock, color: "text-amber-700" },
          { label: "نشطة", value: stats.active, icon: Network, color: "text-blue-700" },
          { label: "محلولة", value: stats.resolved, icon: CheckCircle2, color: "text-emerald-700" },
          { label: "مكسورة", value: stats.broken, icon: AlertTriangle, color: "text-destructive" },
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

      {/* Create form */}
      {showForm && (
        <div className="raqeem-card p-5 space-y-4 relative">
          <button onClick={() => setShowForm(false)} className="absolute top-3 left-3 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold">إنشاء تبعية جديدة · New Dependency</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source */}
            <div className="space-y-2">
              <Label className="text-xs text-primary">المصدر · Source</Label>
              <select value={form.source_id} onChange={(e) => update("source_id", e.target.value)} className={selectClass}>
                <option value="">— اختر قرار —</option>
                {decisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
            {/* Target */}
            <div className="space-y-2">
              <Label className="text-xs text-primary">الهدف · Target</Label>
              <select value={form.target_id} onChange={(e) => update("target_id", e.target.value)} className={selectClass}>
                <option value="">— اختر قرار —</option>
                {decisions.filter((d) => d.id !== form.source_id).map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">نوع التبعية</Label>
              <select value={form.dependency_type} onChange={(e) => update("dependency_type", e.target.value)} className={selectClass}>
                {Object.entries(DEPENDENCY_TYPE).map(([k, v]) => (
                  <option key={k} value={k}>{v.ar} · {v.en}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">ملاحظات</Label>
              <Input value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="ملاحظات حول التبعية" />
            </div>
          </div>
          <Button size="sm" onClick={create} disabled={saving || !form.source_id || !form.target_id}>
            {saving ? "جارٍ الحفظ..." : "إنشاء التبعية"}
          </Button>
        </div>
      )}

      {/* Constellation map */}
      {Object.keys(pairs).length > 0 && (
        <div className="raqeem-card p-5">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" /> خريطة التبعيات · Dependency Constellation
          </h2>
          <div className="space-y-2">
            {Object.entries(pairs).map(([key, pair]) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-md bg-secondary/40">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{committeeName(pair.source)}</div>
                </div>
                <div className="flex flex-col items-center gap-1 px-3">
                  <ArrowRight className="w-5 h-5 text-primary" />
                  <span className="text-[10px] text-muted-foreground">{pair.count} تبعية</span>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-sm font-medium text-foreground truncate">{committeeName(pair.target)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilter("all")} className={`text-xs px-3 py-1.5 rounded-md ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>الكل</button>
        {Object.entries(DEPENDENCY_STATUS).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={`text-xs px-3 py-1.5 rounded-md ${filter === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>{v.ar}</button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={Network} title="لا توجد تبعيات" description="ابدأ بإنشاء تبعية بين قرارات عبر اللجان لتتبع التنسيق المؤسسي" />
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <div key={d.id} className="raqeem-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Flow */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-0.5">{committeeName(d.source_committee_id)}</div>
                      <Link to={d.source_entity_type === "Decision" ? `/decisions/${d.source_id}` : "#"} className="font-medium text-foreground hover:text-primary hover:underline truncate block">
                        {d.source_title}
                      </Link>
                    </div>
                    <div className="flex flex-col items-center gap-1 px-2 shrink-0">
                      <ArrowRight className="w-4 h-4 text-primary" />
                      <StatusBadge label={DEPENDENCY_TYPE[d.dependency_type]?.ar} colorClass={DEPENDENCY_TYPE[d.dependency_type]?.color} />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-xs text-muted-foreground mb-0.5">{committeeName(d.target_committee_id)}</div>
                      <Link to={d.target_entity_type === "Decision" ? `/decisions/${d.target_id}` : "#"} className="font-medium text-foreground hover:text-primary hover:underline truncate block">
                        {d.target_title}
                      </Link>
                    </div>
                  </div>
                  {d.notes && <p className="text-xs text-muted-foreground pt-1">{d.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge label={DEPENDENCY_STATUS[d.status]?.ar} colorClass={DEPENDENCY_STATUS[d.status]?.color} />
                  <div className="flex items-center gap-1">
                    {d.status !== "resolved" && (
                      <button onClick={() => changeStatus(d.id, "resolved")} className="text-[10px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100">حل</button>
                    )}
                    {d.status !== "broken" && (
                      <button onClick={() => changeStatus(d.id, "broken")} className="text-[10px] px-2 py-1 rounded bg-red-50 text-destructive hover:bg-red-100">كسر</button>
                    )}
                    <button onClick={() => remove(d.id)} className="text-[10px] px-2 py-1 rounded text-muted-foreground hover:text-destructive">حذف</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}