import React from "react";
import { cn } from "@/lib/utils";
import { ameenName } from "@/lib/ameenIdentity";

/**
 * AmeenEmblem — the original institutional mark for «أمين».
 *
 * A geometric «أ» (hamza + alif) seated on a committee table, sealed by a
 * gold approval ring. No robot, no chat bubble, no AI sparkle.
 *
 * tones:
 *  - "solid"   → maroon seal, white glyph (default; light backgrounds)
 *  - "outline" → maroon hairline seal, maroon glyph
 *  - "inverse" → white glyph + gold ring (on maroon / dark backgrounds)
 */
export default function AmeenEmblem({ size = 32, tone = "solid", className, label }) {
  const isSolid = tone === "solid";
  const isInverse = tone === "inverse";
  // The assistant's name follows the active language: «أمين» in Arabic, AMEEN in English.
  // Resolved from the ONE identity module, never written here.
  const ariaLabel = label || ameenName();

  const plate = isInverse ? "none" : isSolid ? "#8A1538" : "none";
  const ring = isInverse ? "#B59358" : isSolid ? "#B59358" : "#8A1538";
  const ringOpacity = isInverse ? 0.7 : isSolid ? 0.55 : 0.35;
  const glyph = isInverse ? "#FFFFFF" : isSolid ? "#FFFFFF" : "#8A1538";
  const tableFill = isInverse || isSolid ? "#B59358" : "#8A1538";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={ariaLabel}
      focusable="false"
    >
      {/* Approval seal */}
      <rect x="1.5" y="1.5" width="37" height="37" rx="11.5" fill={plate} />
      <rect
        x="1.5"
        y="1.5"
        width="37"
        height="37"
        rx="11.5"
        fill="none"
        stroke={ring}
        strokeOpacity={ringOpacity}
        strokeWidth="1.3"
      />

      {/* Hamza */}
      <path
        d="M 22.6 9.6 L 19.2 13.2"
        stroke={glyph}
        strokeWidth="2.3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Alif */}
      <rect x="19.05" y="14.9" width="2.7" height="9.6" rx="1.35" fill={glyph} />

      {/* Committee table */}
      <rect x="10.4" y="26.6" width="19.2" height="2.5" rx="1.25" fill={tableFill} />
      {/* Table base / continuity arc */}
      <path
        d="M 12.4 32.2 Q 20 35.6 27.6 32.2"
        stroke={tableFill}
        strokeOpacity="0.65"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}