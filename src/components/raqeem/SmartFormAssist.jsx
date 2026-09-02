import React, { useState, useCallback } from "react";
import { Sparkles, Loader2, Wand2, FileText, Check, X, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

// SmartFormAssist — reusable AI-powered form assistance component.
// Provides field suggestions, auto-fill from context, and human-in-the-loop review.
// Usage: <SmartFormAssist fields={fields} context={context} onApply={onApply} />

export default function SmartFormAssist({ fields, context, onApply, lang = "ar" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState("");

  const t = (ar, en) => (lang === "ar" ? ar : en);

  const generate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const prompt = `أنت مساعد ذكي لتعبئة النماذج الإدارية. اقترح قيم لحقول النموذج التالي بناءً على السياق المتاح.

الحقول المطلوب اقتراحها:
${JSON.stringify(fields, null, 2)}

السياق المتاح:
${JSON.stringify(context, null, 2).substring(0, 2000)}

أعد JSON يحتوي على:
- suggestions: مصفوفة [{field_key, suggested_value, confidence, reasoning}]
- overall_confidence: رقم بين 0 و 1
- notes: ملاحظات بالعربية

لا تخترع قيم غير مدعومة بالسياق. إذا لم توجد معلومة كافية لحقل ما، استخدم null كقيمة مقترحة.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field_key: { type: "string" },
                  suggested_value: { type: "string" },
                  confidence: { type: "number" },
                  reasoning: { type: "string" },
                },
              },
            },
            overall_confidence: { type: "number" },
            notes: { type: "string" },
          },
        },
      });

      setSuggestions(res);
    } catch (e) {
      setError(e?.message || t("تعذّر إنشاء الاقتراحات", "Failed to generate suggestions"));
    }
    setLoading(false);
  }, [fields, context, lang]);

  const applyAll = () => {
    if (!suggestions?.suggestions) return;
    const values = {};
    suggestions.suggestions.forEach((s) => {
      if (s.suggested_value && s.confidence >= 0.3) {
        values[s.field_key] = s.suggested_value;
      }
    });
    onApply(values);
    setOpen(false);
  };

  const applyOne = (field_key, value) => {
    onApply({ [field_key]: value });
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/3 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-primary/5">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-primary">{t("مساعد النماذج الذكي", "Smart Form Assist")}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} className="h-7 text-xs">
          {open ? t("إخفاء", "Hide") : t("إظهار", "Show")}
        </Button>
      </div>

      {open && (
        <div className="p-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("يحلل السياق المتاح ويقترح قيم لحقول النموذج. راجع الاقتراحات قبل التطبيق.", "Analyzes available context and suggests field values. Review suggestions before applying.")}
          </p>

          {!suggestions && !loading && (
            <Button size="sm" onClick={generate} className="w-full">
              <Sparkles className="w-4 h-4" />
              {t("إنشاء الاقتراحات", "Generate Suggestions")}
            </Button>
          )}

          {loading && (
            <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("جارٍ التحليل...", "Analyzing...")}
            </div>
          )}

          {error && (
            <div className="text-xs text-destructive p-2 rounded-md bg-destructive/5">{error}</div>
          )}

          {suggestions && !loading && (
            <div className="space-y-3">
              {/* Overall confidence */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("مستوى الثقة العام", "Overall Confidence")}:</span>
                <div className="flex-1 max-w-[100px] h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${suggestions.overall_confidence >= 0.7 ? "bg-emerald-500" : suggestions.overall_confidence >= 0.4 ? "bg-amber-500" : "bg-destructive"}`}
                    style={{ width: `${Math.round((suggestions.overall_confidence || 0) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{Math.round((suggestions.overall_confidence || 0) * 100)}%</span>
              </div>

              {/* Individual suggestions */}
              {suggestions.suggestions?.map((s, i) => {
                const field = fields.find((f) => f.key === s.field_key);
                return (
                  <div key={i} className="rounded-md border border-border bg-card p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{field?.label || s.field_key}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        s.confidence >= 0.7 ? "bg-emerald-50 text-emerald-700" :
                        s.confidence >= 0.4 ? "bg-amber-50 text-amber-700" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        {Math.round((s.confidence || 0) * 100)}%
                      </span>
                    </div>
                    {s.suggested_value ? (
                      <div className="text-sm text-foreground/80">{s.suggested_value}</div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">{t("لا توجد معلومة كافية", "Insufficient info")}</div>
                    )}
                    {s.reasoning && (
                      <div className="text-[11px] text-muted-foreground">{s.reasoning}</div>
                    )}
                    {s.suggested_value && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => applyOne(s.field_key, s.suggested_value)}
                          className="text-xs flex items-center gap-1 text-primary hover:underline"
                        >
                          <Check className="w-3 h-3" />
                          {t("تطبيق", "Apply")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Apply all + regenerate */}
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={applyAll} className="flex-1">
                  <Check className="w-3.5 h-3.5" />
                  {t("تطبيق الكل", "Apply All")}
                </Button>
                <Button size="sm" variant="outline" onClick={generate}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t("إعادة", "Regenerate")}
                </Button>
              </div>

              {suggestions.notes && (
                <div className="text-xs text-muted-foreground p-2 rounded-md bg-secondary/30">
                  {suggestions.notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}