import React from "react";
import { useLanguage } from "@/lib/LanguageContext";

const CHOICES = {
  for: { ar: "موافق", en: "For", color: "text-state-success-ink" },
  against: { ar: "رافض", en: "Against", color: "text-destructive" },
  abstain: { ar: "ممتنع", en: "Abstain", color: "text-muted-foreground" },
};

/** Individual votes inside the proof chain — choice labels in the active language only. */
export default function ProofChainVotes({ votes }) {
  const { t } = useLanguage();
  return (
    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
      {votes.map((v) => {
        const cfg = CHOICES[v.vote_choice];
        return (
          <div key={v.id} className="flex items-center justify-between text-xs gap-2">
            <span className="text-foreground font-medium truncate">{v.voter_name}</span>
            <span className={cfg?.color || "text-muted-foreground"}>{cfg ? t(cfg.ar, cfg.en) : t("غير محدد", "Not specified")}</span>
          </div>
        );
      })}
    </div>
  );
}