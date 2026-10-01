import React from "react";
import { cn } from "@/lib/utils";

/**
 * AmeenEmblem — the official institutional mark for «أمين» / AMEEN.
 *
 * Composition (flat, geometric, symmetrical):
 *  · a central «أ» pillar whose top transitions into a flame / torch flick
 *  · a ring around its lower half — the committee table, with four attendees
 *  · a shield badge on the lower front carrying a document and a gold approval mark
 *
 * tones:
 *  · "brand" / "solid" / "outline" → maroon body, gold document (light backgrounds)
 *  · "inverse"                     → white body, gold document (maroon / dark backgrounds)
 */
export default function AmeenEmblem({ size = 32, tone = "brand", className }) {
  const isInverse = tone === "inverse";
  const body = isInverse ? "fill-white stroke-white" : "fill-primary stroke-primary";
  const shieldFill = isInverse ? "fill-none" : "fill-background";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="أمين"
      focusable="false"
    >
      {/* Committee table — the ring */}
      <circle cx="32" cy="40" r="15" fill="none" strokeWidth="2.2" className={body} />

      {/* Attendees around the table */}
      <circle cx="16.4" cy="34.3" r="2.2" className={body} />
      <circle cx="16.4" cy="45.7" r="2.2" className={body} />
      <circle cx="47.6" cy="34.3" r="2.2" className={body} />
      <circle cx="47.6" cy="45.7" r="2.2" className={body} />

      {/* The «أ» pillar, rising into a flame */}
      <path
        d="M 28.9 17 C 28.9 12.5 30.4 8.4 32 4 C 33.6 8.4 35.1 12.5 35.1 17 L 35.1 45 C 35.1 48.7 33.7 50 32 50 C 30.3 50 28.9 48.7 28.9 45 Z"
        className={body}
      />

      {/* Approval shield on the lower front */}
      <path
        d="M 25.2 38.6 H 38.8 A 2.2 2.2 0 0 1 41 40.8 V 48 C 41 53.6 36.9 56.7 32 58.4 C 27.1 56.7 23 53.6 23 48 V 40.8 A 2.2 2.2 0 0 1 25.2 38.6 Z"
        strokeWidth="2.2"
        className={cn(shieldFill, isInverse ? "stroke-white" : "stroke-primary")}
      />

      {/* Document lines */}
      <rect x="26.8" y="42" width="10.4" height="1.6" rx="0.8" className="fill-accent" />
      <rect x="26.8" y="45.4" width="10.4" height="1.6" rx="0.8" className="fill-accent" />
      <rect x="26.8" y="48.8" width="7.4" height="1.6" rx="0.8" className="fill-accent" />

      {/* Approval mark */}
      <path
        d="M 26.9 54 L 30.3 56.6 L 36.7 50.8"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-accent"
      />
    </svg>
  );
}