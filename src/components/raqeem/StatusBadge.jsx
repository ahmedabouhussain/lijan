import React from "react";
import { cn } from "@/lib/utils";

// StatusBadge — the single status plate for the whole platform. The state palette comes
// from the caller (state-* tokens); the shape, weight and rhythm are fixed here so a
// status reads the same in a card, a table, a dossier or a dialog.
export default function StatusBadge({ label, colorClass, size = "sm" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        colorClass,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {label}
    </span>
  );
}