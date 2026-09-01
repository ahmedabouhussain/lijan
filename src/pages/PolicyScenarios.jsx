import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, X, GitCompare, Sparkles, TrendingUp, AlertTriangle, Clock, DollarSign, Users, Trophy, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { SCENARIO_TYPE, SCENARIO_STATUS, PRIORITY } from "@/lib/raqeemUtils";

export default function PolicyScenarios() {
  const [scenarios, setScenarios] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [form, setForm] = useState({
    decision_id: "",
    title: "",
    description: "",
    scenario_type: "alternative",
    projected_impact: "",
    projected_cost: "",
    projected_timeline: "",
    risk_level: "medium",
    risk_assessment: "",
    stakeholders_affected: "",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function load() {
    setLoading(true);
    try {
      const [s, d, c] = await Promise.all([
        base44.entities.PolicyScenario.list("-created_date", 200).catch(() => []),
        base44.entities.Decision.list("-created_date", 100).catch(() => []),
        base44.entities.Committee.list().catch(() => []),
      ]);
      setScenarios(s || []);
      setDecisions(d || []);
      setCommittees(c || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const decisionTitle = (id) => decisions.find((d) => d.id === id)?.title || "—";
  const committeeName = (id) => {
    const c = committees.find((x) => x.id === id);
    return c?.name_ar || c?.name_en || "—";
  };

  const create = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const dec = decisions.find((d) => d.id === form.decision_id);
      const payload = {
        ...form,
        committee_id: dec?.committee_id || "",
        status: "draft",
      };
      await base44.entities.PolicyScenario.create(payload);
      await base44.entities.AuditLog.create({
        action: "create",
        entity_type: "PolicyScenario",
        entity_title: form.title,
        description: "إنشاء سيناريو سياسي",
      });
      setForm({ decision_id: "", title: "", description: "", scenario_type: "alternative", projected_impact: "", projected_cost: "", projected_timeline: "", risk_level: "medium", risk_assessment: "", stakeholders_affected: "" });
      setShowForm(false);
      load();
    } catch {}
    setSaving(false);
  };

  const changeStatus = async (id, status) => {
    try {
      await base44.entities.PolicyScenario.update(id, { status });
      await base44.entities.AuditLog.create({
        action: "status_change",
        entity_type: "PolicyScenario",
        entity_id: id,
        new_value: status,
        description: `تحديث حالة السيناريو إلى ${SCENARIO_STATUS[status]?.ar}`,
      });
      load();
    } catch {}
  };

  // AI-assisted impact projection
  const generateImpact = async (scenario) => {
    setGenerating(scenario.id);
    try {
      const prompt = `أنت مستشار سياسي مؤسسي. حلل السيناريو التالي وقدم تقييم أثر احترافي باللغة العربية الرسمية:

السيناريو: ${scenario.title}
الوصف: ${scenario.description || "غير محدد"}

قدم:
1. الأثر المتوقع (projected_impact): تحليل الأثر على المؤسسة والمجتمع (3-4 أسطر)
2. التكلفة المتوقعة (projected_cost): تقدير الموارد المطلوبة
3. الجدول الزمني (projected_timeline): الإطار الزمني المقترح
4. تقييم المخاطر (risk_assessment): المخاطر الرئيسية وكيفية التخفيف

أعد النتيجة بصيغة JSON بالحقول: projected_impact, projected_cost, projected_timeline, risk_assessment`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            projected_impact: { type: "string" },
            projected_cost: { type: "string" },
            projected_timeline: { type: "string" },
            risk_assessment: { type: "string" },
          },
        },
      });

      await base44.entities.PolicyScenario.update(scenario.id, {
        projected_impact: result.projected_impact,
        projected_cost: result.projected_cost,
        projected_timeline: result.projected_timeline,
        risk_assessment: result.risk_assessment,
        ai_generated: true,
        status: "evaluating",
      });
      await base44.entities.AuditLog.create({
        action: "update",
        entity_type: "PolicyScenario",
        entity_id: scenario.id,
        description: "توليد تقييم الأثر بالذكاء الاصطناعي",
      });
      load();
    } catch {}
    setGenerating(null);
  };

  // Group scenarios by decision
  const grouped = {};
  scenarios.forEach((s) => {
    const key = s.decision_id || "unlinked";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
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
            <GitCompare className="w-5 h-5 text-primary" /> التوأم السياسي وقياس الأثر
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Policy & Impact Twin · مقارنة السيناريوهات وقياس الأثر بالذكاء الاصطناعي</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> سيناريو جديد
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="raqeem-card p-5 space-y-4 relative">
          <button onClick={() => setShowForm(false)} className="absolute top-3 left-3 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold">سيناريو جديد · New Scenario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">القرار المرتبط</Label>
              <select value={form.decision_id} onChange={(e) => update("decision_id", e.target.value)} className={selectClass}>
                <option value="">— مستقل —</option>
                {decisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">نوع السيناريو</Label>
              <select value={form.scenario_type} onChange={(e) => update("scenario_type", e.target.value)} className={selectClass}>
                {Object.entries(SCENARIO_TYPE).map(([k, v]) => (
                  <option key={k} value={k}>{v.ar} · {v.en}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">عنوان السيناريو *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="سيناريو السياسة" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">الوصف</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="وصف السيناريو والافتراضات" rows={3} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">الأطراف المتأثرة</Label>
              <Input value={form.stakeholders_affected} onChange={(e) => update("stakeholders_affected", e.target.value)} placeholder="الأطراف المتأثرة بالسيناريو" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">مستوى المخاطر</Label>
              <select value={form.risk_level} onChange={(e) => update("risk_level", e.target.value)} className={selectClass}>
                {Object.entries(PRIORITY).map(([k, v]) => (
                  <option key={k} value={k}>{v.ar} · {v.en}</option>
                ))}
              </select>
            </div>
          </div>
          <Button size="sm" onClick={create} disabled={saving || !form.title.trim()}>
            {saving ? "جارٍ الحفظ..." : "إنشاء السيناريو"}
          </Button>
        </div>
      )}

      {/* Grouped comparison */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState icon={GitCompare} title="لا توجد سيناريوهات" description="أنشئ سيناريوهات سياسية وقارن أثرها المتوقع لدعم القرارات المؤسسية" />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([decKey, groupScenarios]) => (
            <div key={decKey} className="raqeem-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {decKey === "unlinked" ? "سيناريوهات مستقلة" : (
                      <Link to={`/decisions/${decKey}`} className="hover:text-primary hover:underline">{decisionTitle(decKey)}</Link>
                    )}
                  </h3>
                  {groupScenarios[0]?.committee_id && (
                    <p className="text-xs text-muted-foreground mt-0.5">{committeeName(groupScenarios[0].committee_id)}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{groupScenarios.length} سيناريو</span>
              </div>

              {/* Side-by-side comparison cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupScenarios.map((s) => (
                  <div key={s.id} className={`rounded-md border p-4 space-y-3 ${
                    s.status === "selected" ? "border-emerald-300 bg-emerald-50/30" :
                    s.status === "rejected" ? "border-red-200 bg-red-50/20 opacity-75" :
                    "border-border bg-background"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge label={SCENARIO_TYPE[s.scenario_type]?.ar} colorClass={SCENARIO_TYPE[s.scenario_type]?.color} />
                          {s.ai_generated && <Sparkles className="w-3 h-3 text-accent" />}
                        </div>
                        <h4 className="text-sm font-medium text-foreground">{s.title}</h4>
                      </div>
                      <StatusBadge label={SCENARIO_STATUS[s.status]?.ar} colorClass={SCENARIO_STATUS[s.status]?.color} />
                    </div>

                    {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}

                    {/* Impact fields */}
                    <div className="space-y-2 pt-1 border-t border-border">
                      {s.projected_impact && (
                        <div className="flex items-start gap-1.5">
                          <TrendingUp className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          <p className="text-[11px] text-foreground/80 line-clamp-2">{s.projected_impact}</p>
                        </div>
                      )}
                      {s.projected_cost && (
                        <div className="flex items-start gap-1.5">
                          <DollarSign className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{s.projected_cost}</p>
                        </div>
                      )}
                      {s.projected_timeline && (
                        <div className="flex items-start gap-1.5">
                          <Clock className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{s.projected_timeline}</p>
                        </div>
                      )}
                      {s.risk_assessment && (
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{s.risk_assessment}</p>
                        </div>
                      )}
                      {s.stakeholders_affected && (
                        <div className="flex items-start gap-1.5">
                          <Users className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{s.stakeholders_affected}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                      {s.status !== "selected" && s.status !== "rejected" && (
                        <button onClick={() => generateImpact(s)} disabled={generating === s.id} className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 disabled:opacity-50">
                          <Sparkles className="w-3 h-3" />
                          {generating === s.id ? "جارٍ..." : "توليد الأثر"}
                        </button>
                      )}
                      {s.status !== "selected" && (
                        <button onClick={() => changeStatus(s.id, "selected")} className="text-[10px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> اختيار
                        </button>
                      )}
                      {s.status !== "rejected" && (
                        <button onClick={() => changeStatus(s.id, "rejected")} className="text-[10px] px-2 py-1 rounded bg-red-50 text-destructive hover:bg-red-100 inline-flex items-center gap-1">
                          <Ban className="w-3 h-3" /> رفض
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}