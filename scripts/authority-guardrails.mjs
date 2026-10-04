#!/usr/bin/env node
// authority-guardrails.mjs — static check that stops the forbidden authority patterns from
// returning to the codebase. Run: node scripts/authority-guardrails.mjs
//
// ERROR  → a pattern that would hand authority to client input (must be fixed before shipping).
// WARN   → a pattern that is only tolerated inside provisioning fixtures, a command that still
//          trusts a committee LOOKUP HINT instead of its target record, or a write still gated by a
//          read capability (needs an explicit capability).
//
// The migrated/un-migrated split at the end is the migration ledger: a command counts as migrated
// only when it asks `authorizeCommand` for authority on a trusted target.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["base44/functions", "base44/shared"];
const FIXTURE_ALLOWLIST = /(Provision|Seed|Repair|demoDataset|drHamadDataset|demoPersonas|operationalPack)/;

// A client value passed as authority is an error. A value DERIVED from a server-loaded record is
// not — the rules therefore only fire on client sources.
const ERRORS = [
  { id: "client-role-authority", re: /\b(body|payload|req\.body)\.(role|is_admin|can_sign|can_approve)\b/, why: "client-supplied role/flag used as authority" },
  { id: "client-org-in-guard", re: /resolveAuthority\([\s\S]{0,400}?organization_id\s*:\s*(body|payload|req|request)/, why: "a client-supplied organization_id passed into the authority guard" },
  { id: "client-role-in-guard", re: /resolveAuthority\([\s\S]{0,400}?\brole\s*:\s*(body|payload|req|request)/, why: "a client-supplied role passed into the authority guard" },
  { id: "name-identity-match", re: /(filter|find|some)\([^)]*\bmember_name\s*:/, why: "identity matched by name — resolve the seat by identifier" },
  { id: "fail-open-authority", re: /catch\(\(\)\s*=>\s*\(?\s*\{\s*allowed:\s*true/, why: "authority falls back to ALLOW when resolution fails (fail-open)" },
];

const WRITE_CALL = /entities\.[A-Za-z]+\.(create|update|updateMany|bulkUpdate|delete|deleteMany)\s*\(/;
const READ_ONLY_CAP = /capability:\s*['"]read['"]/;
const GUARDED_CALL = /authorizeCommand\s*\(/;
const HINT_ONLY_CALL = /resolveAuthority\s*\(/;
const WITH_TRUSTED_RECORD = /record\s*:/;

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
const migrated = [];
const unmigrated = [];

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
    warnings.push({ rel, id: "recusal-name-legacy", why: "recusal/identity keyed by name — migrate to identifiers" });
  }
  // The migration ledger: a command that still asks the kernel for authority with a committee hint
  // and no trusted target record has not been migrated to the guarded path yet.
  if (HINT_ONLY_CALL.test(src) && !WITH_TRUSTED_RECORD.test(src)) {
    unmigrated.push(rel);
    warnings.push({ rel, id: "scope-hint-only", why: "authority asked with a committee lookup hint and no trusted target — migrate to authorizeCommand" });
  }
  if (GUARDED_CALL.test(src)) migrated.push(rel);
}

console.log(`authority-guardrails — scanned ${files.length} files`);
for (const e of errors) console.log(`ERROR [${e.id}] ${e.rel} — ${e.why}`);
for (const w of warnings) console.log(`WARN  [${w.id}] ${w.rel} — ${w.why}`);
console.log(`\nmigration ledger — guarded: ${migrated.length} file(s), hint-only: ${unmigrated.length} file(s)`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length > 0 ? 1 : 0);