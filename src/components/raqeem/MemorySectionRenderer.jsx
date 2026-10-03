import React from "react";
import { Brain, FileCheck, AlertCircle, BookOpen, Lightbulb, TrendingUp, ShieldAlert } from "lucide-react";

const SECTION_ICONS = {
  key_achievements: TrendingUp,
  lessons_learned: Lightbulb,
  patterns: BookOpen,
  recommendations: ShieldAlert,
  decision_precedent: FileCheck,
  open_items: AlertCircle,
  default: Brain,
};

const SECTION_TITLES = {
  key_achievements: { ar: "الإنجازات الرئيسية", en: "Key Achievements" },
  lessons_learned: { ar: "الدروس المستفادة", en: "Lessons Learned" },
  patterns: { ar: "الأنماط الملاحظة", en: "Observed Patterns" },
  recommendations: { ar: "التوصيات للجنة الخلف", en: "Recommendations" },
  decision_precedent: { ar: "السوابق القرارية", en: "Decision Precedents" },
  open_items: { ar: "المسائل غير المغلقة", en: "Open Items" },
};

const EVIDENCE_BADGES = {
  verified: { ar: "موثَّق", en: "Verified", class: "bg-emerald-50 text-emerald-700" },
  partial: { ar: "جزئي", en: "Partial", class: "bg-amber-50 text-amber-700" },
  insufficient: { ar: "أدلة غير كافية", en: "Insufficient Evidence", class: "bg-destructive/10 text-destructive" },
};

export default function MemorySectionRenderer({ sections, lang = "ar" }) {
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {lang === "ar" ? "لا توجد أقسام ذاكرة متاحة." : "No memory sections available."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, i) => {
        const Icon = SECTION_ICONS[section.section_type] || SECTION_ICONS.default;
        const titles = SECTION_TITLES[section.section_type] || {};
        const title = lang === "ar" ? (section.title_ar || titles.ar || section.section_type) : (section.title_en || titles.en || section.section_type);
        const summary = lang === "ar" ? section.summary_ar : (section.summary_en || section.summary_ar);
        const evidence = EVIDENCE_BADGES[section.evidence_status] || EVIDENCE_BADGES.insufficient;

        return (
          <div key={i} className="raqeem-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">{title}</h4>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${evidence.class}`}>
                {lang === "ar" ? evidence.ar : evidence.en}
              </span>
            </div>

            {summary ? (
              <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {lang === "ar" ? "أدلة غير كافية" : "Insufficient Evidence"}
              </p>
            )}

            {section.source_references && section.source_references.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {section.source_references.map((ref, j) => (
                  <span key={j} className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                    {ref.record_type || (lang === "ar" ? "سجل" : "Record")} {ref.record_number || ref.record_id?.slice(-8) || ""}
                  </span>
                ))}
              </div>
            )}

            {typeof section.confidence === "number" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{lang === "ar" ? "مستوى الثقة" : "Confidence"}:</span>
                <div className="flex-1 max-w-[100px] h-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${section.confidence >= 0.7 ? "bg-emerald-500" : section.confidence >= 0.4 ? "bg-amber-500" : "bg-destructive"}`}
                    style={{ width: `${Math.round(section.confidence * 100)}%` }}
                  />
                </div>
                <span>{Math.round(section.confidence * 100)}%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}