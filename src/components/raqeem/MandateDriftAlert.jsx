import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronDown, ChevronUp, Scale, FileText } from "lucide-react";

/**
 * MandateDriftAlert™ — Section 10
 * A calm inline alert that appears when an action/decision might exceed the committee's mandate.
 * Does NOT block — only advises. The human makes the final decision.
 *
 * Props:
 * - drift: { detected: boolean, reason: string, reference_text: string, confidence: "high"|"medium"|"low", doc_link: string }
 * - or pass raw fields and it computes drift heuristically.
 */
export default function MandateDriftAlert({ drift, committee, item }) {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  // If no pre-computed drift, compute heuristically
  if (!drift && committee && item) {
    drift = computeDrift(committee, item);
  }

  if (!drift || !drift.detected) return null;

  const confidenceStyles = {
    high: "border-primary/30 bg-primary/5 text-primary",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    low: "border-secondary bg-secondary/50 text-muted-foreground",
  };

  const confidenceLabel = {
    high: { ar: "موثوق بالأدلة", en: "Evidence-backed" },
    medium: { ar: "يحتاج مراجعة", en: "Needs review" },
    low: { ar: "أدلة غير كافية", en: "Insufficient evidence" },
  };

  return (
    <div className={cn("rounded-lg border p-3", confidenceStyles[drift.confidence] || confidenceStyles.medium)}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2.5 text-start"
        aria-expanded={expanded}
      >
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {t("قد يحتاج هذا الإجراء إلى مراجعة الصلاحية", "This action may need mandate review")}
          </p>
          <p className="text-[11px] mt-0.5 opacity-80">{drift.reason}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/50">
              {t(confidenceLabel[drift.confidence]?.ar || "يحتاج مراجعة", confidenceLabel[drift.confidence]?.en || "Needs review")}
            </span>
            {expanded ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-current/10 space-y-2">
          {drift.reference_text && (
            <div className="flex items-start gap-2">
              <Scale className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">{t("النص المرجعي", "Reference Text")}</p>
                <p className="text-[11px] mt-0.5 leading-relaxed">{drift.reference_text}</p>
              </div>
            </div>
          )}
          {drift.doc_link && (
            <a
              href={drift.doc_link}
              className="inline-flex items-center gap-1 text-[11px] hover:underline"
            >
              <FileText className="w-3 h-3" aria-hidden="true" />
              {t("فتح الوثيقة المرجعية", "Open reference document")}
            </a>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button className="text-[11px] px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              {t("طلب رأي قانوني", "Request legal opinion")}
            </button>
            <button className="text-[11px] px-2.5 py-1.5 rounded-md border border-current/20 hover:bg-current/5 transition-colors">
              {t("إقرار بالمراجعة", "Acknowledge review")}
            </button>
          </div>
          <p className="text-[10px] opacity-60 pt-1">
            {t("هذا تنبيه مساند ولا يمنع العملية. القرار النهائي للإنسان.", "This is an advisory alert and does not block the process. The final decision is human.")}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Heuristic drift detection — compares item against committee mandate/scope.
 * This is a lightweight client-side check; deep analysis should be done via backend LLM.
 */
function computeDrift(committee, item) {
  if (!committee || !item) return { detected: false };

  const mandate = (committee.mandate || committee.scope || "").toLowerCase();
  const title = (item.title || item.proposal || "").toLowerCase();
  const description = (item.description || "").toLowerCase();

  if (!mandate || !title) return { detected: false };

  // Simple keyword overlap heuristic
  const mandateWords = mandate.split(/\s+/).filter((w) => w.length > 4);
  const titleWords = title.split(/\s+/).filter((w) => w.length > 4);
  const overlap = mandateWords.filter((w) => titleWords.includes(w));

  // Very low overlap might indicate drift
  if (overlap.length === 0 && titleWords.length > 3) {
    return {
      detected: true,
      reason: {
        ar: "عنوان الإجراء لا يتضمن كلمات من صلاحية اللجنة",
        en: "Action title does not include words from the committee mandate",
      }[document.documentElement.dir === "rtl" ? "ar" : "en"],
      reference_text: committee.mandate || committee.scope || "",
      confidence: "low",
    };
  }

  // Check term expiry for temporary committees
  if (committee.type?.includes("temporary") && committee.term_end) {
    const now = new Date();
    const daysLeft = Math.ceil((new Date(committee.term_end) - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 30 && daysLeft > 0) {
      return {
        detected: true,
        reason: {
          ar: `مدة اللجنة تنتهي خلال ${daysLeft} يومًا — قد لا يتسع الوقت لتنفيذ هذا الإجراء`,
          en: `Committee term ends in ${daysLeft} days — there may not be time to execute this action`,
        }[document.documentElement.dir === "rtl" ? "ar" : "en"],
        reference_text: `Term end: ${committee.term_end}`,
        confidence: "medium",
      };
    }
  }

  return { detected: false };
}