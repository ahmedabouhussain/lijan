#!/usr/bin/env node
// authority-guardrails.mjs — static check that stops the forbidden authority patterns from
// returning to the codebase. Run: node scripts/authority-guardrails.mjs
//
// ERROR  → a pattern that would hand authority to client input (must be fixed before shipping).
// WARN   → a pattern that is only tolerated inside provisioning fixtures, or a write that is
//          currently gated by a read capability (needs an explicit capability).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["base44/functions", "base44/shared"];
const FIXTURE_ALLOWLIST = /(Provision|Seed|Repair|demoDataset|drHamadDataset|demoPersonas|operationalPack)/;

const ERRORS = [
  { id: "client-role-authority", re: /\b(body|payload|req\.body)\.(role|is_admin|can_sign|can_approve)\b/, why: "client-supplied role/flag used as authority" },
  { id: "client-org-in-guard", re: /resolveAuthority\([^)]*organization_id\s*:/, why: "organization_id passed into the authority guard" },
  { id: "name-identity-match", re: /member_name:\s*(?!.*(DEMO|fixture|name_ar|name_en))[a-zA-Z]/, why: "identity matched by name" },
  { id: "fail-open-authority", re: /catch\(\(\)\s*=>\s*\(?\s*\{\s*allowed:\s*true/, why: "authority falls back to ALLOW when resolution fails (fail-open)" },
];

const WRITE_CALL = /entities\.[A-Za-z]+\.(create|update|updateMany|bulkUpdate|delete|deleteMany)\s*\(/;
const READ_ONLY_CAP = /capability:\s*['"]read['"]/;

function walk(dir, files = []) {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const full = join(dir, entry);
    if (statSync(join(ROOT, full)).isDirectory()) walk(full, files);
    else if (full.endsWith(".ts")) files.push(full);
  }
  return files;
}

const files = SCAN_DIRS.flatMap((d) => walk(d));
const errors = [];
const warnings = [];

for (const file of files) {
  const src = readFileSync(join(ROOT, file), "utf8");
  const rel = relative(ROOT, file);
  for (const rule of ERRORS) {
    if (rule.re.test(src) && !FIXTURE_ALLOWLIST.test(rel)) {
      errors.push({ rel, id: rule.id, why: rule.why });
    }
  }
  if (WRITE_CALL.test(src) && READ_ONLY_CAP.test(src)) {
    warnings.push({ rel, id: "write-gated-by-read", why: "a write command is gated by the 'read' capability" });
  }
  if (/member_name:/.test(src) && !FIXTURE_ALLOWLIST.test(rel)) {
    warnings.push({ rel, id: "recusal-name-legacy", why: "recusal/identity still keyed by name — migrate to identifiers" });
  }
}

console.log(`authority-guardrails — scanned ${files.length} files`);
for (const e of errors) console.log(`ERROR [${e.id}] ${e.rel} — ${e.why}`);
for (const w of warnings) console.log(`WARN  [${w.id}] ${w.rel} — ${w.why}`);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length > 0 ? 1 : 0);