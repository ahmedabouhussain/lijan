#!/usr/bin/env node
// LGUARD-1 — static guard against raw governed-enum rendering.
//
// Detects direct JSX rendering of a governed status/state/rule/response field
// that is NOT routed through the canonical bilingual label resolver
// (L.*, labelOf, label(...), StatusBadge with a map label, t() with a map arg).
//
// It distinguishes:
//   - legitimate logic comparisons (===, !==, ==, !=, ?, &&, ||)   → ignored
//   - persistence values / API payloads (inside create/update payload objects) → ignored
//   - visible UI rendering                                        → flagged
//
// Exit code 1 if any unresolved raw render is found, else 0.
// Run: node scripts/lang-guard.mjs

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "src";
const GOVERNED_FIELDS = new Set([
  "status", "state", "rule", "response", "readiness", "priority", "stage",
  "escalation_level", "verification_state", "delivery_status", "report_stage",
  "dispatch_state", "outcome", "incident_type", "severity", "risk_tier",
  "confidentiality", "delegation_status", "amendment_status",
]);

// Known free-text (non-enum) fields that share a name with a governed enum field.
// Rendering these directly is correct — they are authored text, not status codes.
const FREE_TEXT = new Set(["deliberation.outcome"]);

const RESOLVER_HINTS = [
  "L.label", "L.status", "L.color", "L.name", "labelOf", "label(", "colorOf",
  "statusLabel", "StatusLabel", "StatusBadge", "t(", "label_ar", "label_en",
  ".label", "nameOf", "L.title", "L.date",
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (extname(p) === ".jsx" || extname(p) === ".tsx") acc.push(p);
  }
  return acc;
}

// Match {IDENT.field} or {IDENT.field || fallback} style bare renders in JSX.
// We look for the field access wrapped in braces, not preceded by a comparison operator.
const RENDER_RE = /\{([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)(?:\s*\|\|[^}]*)?\}/g;

let findings = 0;
const files = walk(ROOT);

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    // Skip lines that are clearly logic (comparisons) or payload construction.
    const isLogic = /[=!]==?/.test(line) || /\?[^:]*:/.test(line) && !/>\{/.test(line);
    const isPayload = /\.(create|update|bulkCreate|upsert|filter|payload)\s*[=(]/.test(line)
      || /payload\s*:/.test(line) || /const\s+payload/.test(line);
    if (isLogic || isPayload) return;

    let m;
    RENDER_RE.lastIndex = 0;
    while ((m = RENDER_RE.exec(line))) {
      const ident = m[1];
      const field = m[2];
      if (!GOVERNED_FIELDS.has(field)) continue;
      // Free-text field sharing a governed name — rendering directly is correct.
      if (FREE_TEXT.has(`${ident}.${field}`)) continue;
      // Heuristic: only flag if the render sits in JSX text/attribute position
      // (preceded by `>` or `label=` or `title=` or at line start in JSX).
      const before = line.slice(0, m.index);
      // A form input `value={x.field}` is a persistence value, not a display label.
      if (/value=\s*$/.test(before)) continue;
      // Is it wrapped by a resolver on the same line?
      const slice = line.slice(Math.max(0, m.index - 12), m.index + m[0].length + 4);
      const resolved = RESOLVER_HINTS.some((h) => slice.includes(h));
      // StatusBadge label={x.status} is a resolver-wrapped render — accept it.
      if (resolved) continue;
      if (!/(>\s*$|=\{|label=|title=|description=|alt=|aria-label=)/.test(before) && !/^\s*\{/.test(before)) {
        continue;
      }
      findings++;
      console.log(`${file}:${i + 1}  {${ident}.${field}}  |  ${line.trim().slice(0, 120)}`);
    }
  });
}

if (findings > 0) {
  console.log(`\nLGUARD-1: ${findings} unresolved raw governed-enum render(s) found.`);
  process.exit(1);
} else {
  console.log("LGUARD-1: no unresolved raw governed-enum renders found.");
  process.exit(0);
}