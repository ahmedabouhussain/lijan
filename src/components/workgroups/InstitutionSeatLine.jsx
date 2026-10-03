// LIJAN™ — InstitutionSeatLine.
//
// A work group sits under institutions, and each of those institutions also holds a seat in the
// committee. That seat is a SEPARATE fact from the delegate: it is DERIVED from the committee's own
// membership records and is labelled as the institution's seat — never presented as the delegate's
// own seat, and never stored on the delegate's record. When the institution holds no committee seat
// the line says so outright instead of borrowing another person's seat.

import React from "react";
import { Landmark } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

export default function InstitutionSeatLine({ seatHolderName, className }) {
  const { t } = useLanguage();
  const hasSeat = Boolean(seatHolderName);

  return (
    <p className={cn("flex items-start gap-1 text-[11px] leading-snug text-muted-foreground", className)}>
      <Landmark className="w-3 h-3 shrink-0 mt-[2px]" aria-hidden="true" />
      <span className="min-w-0">
        {t("مقعد اللجنة للجهة", "Institution's committee seat")}:{" "}
        <span className={hasSeat ? "font-medium text-foreground" : undefined}>
          {hasSeat ? seatHolderName : t("لا مقعد للجهة في اللجنة", "This institution holds no committee seat")}
        </span>
      </span>
    </p>
  );
}