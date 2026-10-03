#!/usr/bin/env node
// LIJAN™ — automated language audit (assistive).
//
// Detects the mechanical cases that break single-language separation:
//   1. ar_in_code     — an Arabic literal on a line that resolves no active language
//   2. raw_enum       — a stored enum rendered straight into JSX ({status}, {x.role})
//   3. single_arg_t   — t("one") with no counterpart (cannot switch language)
//   4. cross_fallback — the other language used as a silent substitute inside t(...)
//   5. attr_literal   — aria-label / placeholder / title holding a hardcoded literal
//
// It is an assist, not a substitute for reading the screens in both languages.
// Usage: node scripts/lang-check.mjs [--top=20]

import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(process.cwd(), "src");
const ARABIC = /[\u0600-\u06FF]/;
// A line resolves the active language when it passes through one of these.
const LOCALIZER = /\bt\(|L\.(name|title|label|status|pair|value|color)|\b(labelOf|nameOf|titleOf|statusOf|bilingualOrLegacy|dateOf|ameenName|ameenDescription|pick)\(/;
// Bilingual DATA (a deliberate {ar: …, en: …} pair or an *_ar/*_en field) is correct.
const BILINGUAL_DATA = /(^|[\s{,(])(ar|en)\s*:\s*["'`]|_(ar|en)\s*:|_(ar|en)["'\]]/;
const EXT = new Set([".js", ".jsx"]);

const findings = { ar_in_code: [], raw_enum: [], single_arg_t: [], cross_fallback: [], attr_literal: [] };

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (EXT.has(path.extname(entry.name))) scan(full);
  }
}

function scan(file) {
  const rel = path.relative(process.cwd(), file);
  if (rel.includes("components/ui/")) return; // shadcn primitives: no governance copy
  const lines = fs.readFileSync(file, "utf8").split("\n");

  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;

    if (ARABIC.test(line) && !LOCALIZER.test(line) && !BILINGUAL_DATA.test(line)) {
      findings.ar_in_code.push(`${at}  ${trimmed.slice(0, 110)}`);
    }
    if (/>\{(?:[A-Za-z_$][\w$]*\.)?(status|state|type|role|priority|classification|mode|level|cadence|rule|origin|source|decision)\}/.test(line)) {
      findings.raw_enum.push(`${at}  ${trimmed.slice(0, 110)}`);
    }
    const single = line.match(/\bt\("[^"]{2,}"\)/);
    if (single) findings.single_arg_t.push(`${at}  ${single[0]}`);
    if (/\bt\(\s*[^,)]*_(ar|en)\b[^,)]*\|\|/.test(line) || /\bt\(\s*[^,)]*\|\|[^,)]*_(ar|en)\b/.test(line)) {
      findings.cross_fallback.push(`${at}  ${trimmed.slice(0, 110)}`);
    }
    if (/(aria-label|placeholder|title)="[^"{}]*[\u0600-\u06FF][^"]*"/.test(line) || /(aria-label|placeholder|title)="[A-Za-z][^"{}]{6,}"/.test(line)) {
      if (!line.includes("{")) findings.attr_literal.push(`${at}  ${trimmed.slice(0, 110)}`);
    }
  });
}

walk(SRC);

const topArg = process.argv.find((a) => a.startsWith("--top="));
const top = Number(topArg?.split("=")[1]) || 12;
let total = 0;

for (const [kind, list] of Object.entries(findings)) {
  total += list.length;
  console.log(`\n── ${kind} — ${list.length}`);
  list.slice(0, top).forEach((l) => console.log(`   ${l}`));
  if (list.length > top) console.log(`   … +${list.length - top} more`);
}

console.log(`\nTOTAL FINDINGS: ${total}`);