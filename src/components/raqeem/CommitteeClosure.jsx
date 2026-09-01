import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Lock, ShieldCheck, AlertTriangle, CheckCircle2, Sparkles, Archive, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS, ACTION_STATUS, MINUTES_STATUS } from "@/lib/raqeemUtils";

export default function CommitteeClosure({ committee, members, meetings, decisions, actions, minutes, onChanged }) {
  const [extracting, setExtracting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [memorySummary, setMemorySummary] = useState(null);
  const [error, setError] = useState("");

  const isClosed = committee.status === "closed" || committee.status === "closing";

  // Closure readiness gate
  const openDecisions = decisions.filter((d) => !["approved", "rejected", "completed", "closed", "superseded", "deferred"].includes(d.status));
  const openActions = actions.filter((a) => !["closed", "verified"].includes(a.status));
  const unissuedMinutes = minutes.filter((m) => !["issued", "approved"].includes(m.status));

  const readinessChecks = [
    { label: "جميع القرارات مغلقة", ready: openDecisions.length === 0, remaining: openDecisions.length },
    { label: "جميع الإجراءات منجزة", ready: openActions.length === 0, remaining: openActions.length },
    { label: "جميع المحاضر صادرة", ready: unissuedMinutes.length === 0, remaining: unissuedMinutes.length },
  ];
  const allReady = readinessChecks.every((c) => c.ready);

  // AI memory extraction
  const extractMemory = async () => {
    setExtracting(true);
    setError("");
    try {
      const decisionSummaries = decisions.map((d) => `- ${d.title} (${DECISION_STATUS[d.status]?.ar || d.status}): ${d.outcome || d.proposal || "—"}`).join("\n");
      const actionSummaries = actions.map((a) => `- ${a.title}: ${a.owner_name} (${ACTION_STATUS[a.status]?.ar || a.status})`).join("\n");
      const meetingCount = meetings.length;
      const memberCount = members.length;

      const prompt = `أنت مؤرشف مؤسسي. استخرج الذاكرة المؤسسية للجنة التالية بصيغة احترافية رسمية باللغة العربية:

اللجنة: ${committee.name_ar || committee.name_en}
الصلاحية: ${committee.mandate || "—"}
النطاق: ${committee.scope || "—"}
عدد الأعضاء: ${memberCount}
عدد الاجتماعات: ${meetingCount}

القرارات (${decisions.length}):
${decisionSummaries}

الإجراءات (${actions.length}):
${actionSummaries}

قدم ملخص الذاكرة المؤسسية يشمل:
1. الإنجازات الرئيسية (key_achievements): 3-5 إنجازات بارزة
2. الدروس المستفادة (lessons_learned): 3-5 دروس
3. الأنماط الملاحظة (patterns): 2-3 أنماط في اتخاذ القرار
4. التوصيات للجنة الخلف (recommendations): 2-3 توصيات

أعد النتيجة بصيغة JSON بالحقول: key_achievements, lessons_learned, patterns, recommendations (كل حقل نص متعدد الأسطر)`;

      const res = await base44.functions.invoke("GenerateInstitutionalMemory", { committee_id: committee.id });
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
      } else {
        setMemorySummary(data.summary);
      }
    } catch (e) {
      setError("تعذّر توليد ملخص الذاكرة. حاول مرة أخرى.");
    }
    setExtracting(false);
  };

  // Transfer memory & close
  const transferAndClose = async () => {
    if (!memorySummary) return;
    setClosing(true);
    try {
      // Save to Founder Vault as institutional memory
      await base44.entities.FounderVaultEntry.create({
        entry_type: "institutional_memory",
        code: `MEM-${committee.name_en?.substring(0, 20) || committee.id.substring(0, 8)}`,
        title: `ذاكرة مؤسسية: ${committee.name_ar || committee.name_en}`,
        title_ar: `ذاكرة مؤسسية: ${committee.name_ar || committee.name_en}`,
        category: "إغلاق لجنة",
        content: memorySummary,
        status: "completed",
        sequence: 0,
      });

      // Mark committee as closed
      await base44.entities.Committee.update(committee.id, { status: "closed" });

      // Audit log
      await base44.entities.AuditLog.create({
        action: "close",
        entity_type: "Committee",
        entity_id: committee.id,
        entity_title: committee.name_ar || committee.name_en,
        description: "إغلاق اللجنة ونقل الذاكرة المؤسسية إلى الخزنة",
      });

      onChanged();
    } catch (e) {
      setError("تعذّر إكمال الإغلاق. حاول مرة أخرى.");
    }
    setClosing(false);
  };

  if (isClosed) {
    return (
      <div className="raqeem-card p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-emerald-50 flex items-center justify-center">
            <Archive className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">اللجنة مغلقة · Committee Closed</h2>
            <p className="text-xs text-muted-foreground mt-0.5">تم نقل الذاكرة المؤسسية إلى خزنة المؤسس ويمكن الرجوع إليها في أي وقت</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="raqeem-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Archive className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">إغلاق اللجنة ونقل الذاكرة · Institutional Memory Transfer</h2>
      </div>

      {/* Readiness Gate */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground font-medium">بوابة جاهزية الإغلاق · Closure Readiness Gate</div>
        {readinessChecks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 p-2 rounded-md bg-secondary/40">
            {check.ready ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span className={`text-sm flex-1 ${check.ready ? "text-foreground" : "text-amber-800"}`}>{check.label}</span>
            {!check.ready && <span className="text-xs text-amber-700">{check.remaining} متبقي</span>}
          </div>
        ))}
      </div>

      {/* Memory extraction */}
      {allReady && !memorySummary && (
        <div className="space-y-3">
          <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
            <p className="text-xs text-foreground/80">
              اللجنة جاهزة للإغلاق. ابدأ باستخراج الذاكرة المؤسسية بالذكاء الاصطناعي — سيحلل القرارات والإجراءات والاجتماعات ويولّد ملخصاً شاملاً للإنجازات والدروس والتوصيات.
            </p>
          </div>
          <Button size="sm" onClick={extractMemory} disabled={extracting} className="inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {extracting ? "جارٍ استخراج الذاكرة..." : "استخراج الذاكرة المؤسسية"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      {/* Memory preview */}
      {memorySummary && (
        <div className="space-y-3">
          <div className="p-4 rounded-md bg-secondary/40 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold">ملخص الذاكرة المؤسسية · Institutional Memory Summary</span>
            </div>
            <div className="text-xs text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">{memorySummary}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={transferAndClose} disabled={closing} className="inline-flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {closing ? "جارٍ النقل والإغلاق..." : "نقل الذاكرة وإغلاق اللجنة"}
            </Button>
            <Button size="sm" variant="outline" onClick={extractMemory} disabled={extracting}>
              إعادة التوليد
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      {/* Not ready message */}
      {!allReady && (
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">أكمل العناصر المتبقية قبل أن يمكن إغلاق اللجنة ونقل ذاكرتها.</p>
          </div>
        </div>
      )}
    </div>
  );
}