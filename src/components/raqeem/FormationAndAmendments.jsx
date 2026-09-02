import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import CommitteeFormation from "@/pages/committee/CommitteeFormation";
import CommitteeAmendments from "@/pages/committee/CommitteeAmendments";

export default function FormationAndAmendments() {
  const { t } = useLanguage();
  const [view, setView] = useState("formation");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setView("formation")}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm transition-colors",
            view === "formation"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {t("التشكيل الحالي", "Current Formation")}
        </button>
        <button
          onClick={() => setView("amendments")}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm transition-colors",
            view === "amendments"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {t("التعديلات المقترحة", "Proposed Amendments")}
        </button>
      </div>
      {view === "formation" ? <CommitteeFormation /> : <CommitteeAmendments />}
    </div>
  );
}