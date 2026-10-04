#!/usr/bin/env node
// authority-guardrails.mjs — static check that stops the forbidden authority patterns from
// returning to the codebase, plus the generated command-migration ledger.
// Run: node scripts/authority-guardrails.mjs
//
// ERROR  → hands authority to client input, keys identity by name, falls back to ALLOW when
//          authority resolution fails, or gates a WRITE with a READ capability. Each one must be
//          fixed before shipping.
// WARN   → only tolerated inside provisioning fixtures or a command that still asks by committee
//          LOOKUP HINT instead of acting on its trusted target (the migration backlog).
//
// The ledger is written to docs/AUTHORITY_COMMAND_LEDGER.md so coverage can never be asserted from
// memory: one row per command site, and the overlapping sets are reported as a UNION, not as
// independent counts.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const STRICT = process.argv.includes("--strict");
const SCAN_DIRS = ["base44/functions", "base44/shared"];
const FIXTURE_ALLOWLIST = /(Provision|Seed|Repair|demoDataset|drHamadDataset|demoPersonas|operationalPack)/;
// The policy modules ARE the authority implementation: they name capabilities by value and write
// only their own tamper audit, so the write-gated rule does not apply to them.
const POLICY_MODULES = /(shared\/authorityKernel\.ts|shared\/commandGuard\.ts)$/;

const ERRORS = [
  { id: "client-role-authority", re: /\b(body|payload|req\.body)\.(role|is_admin|can_sign|can_approve)\b/, why: "client-supplied role/flag used as authority" },
  { id: "client-org-in-guard", re: /resolveAuthority\([\s\S]{0,400}?organization_id\s*:\s*(body|payload|req|request)/, why: "a client-supplied organization_id passed into the authority guard" },
  { id: "client-role-in-guard", re: /resolveAuthority\([\s\S]{0,400}?\brole\s*:\s*(body|payload|req|request)/, why: "a client-supplied role passed into the authority guard" },
  { id: "name-identity-match", re: /(filter|find|some)\([^)]*\bmember_name\s*[:=]/, why: "identity matched by name — resolve the seat by identifier" },
  { id: "fail-open-authority", re: /catch\(\(\)\s*=>\s*\(?\s*\{\s*allowed:\s*true/, why: "authority falls back to ALLOW when resolution fails (fail-open)" },
  { id: "write-gated-by-read", re: /(^|[\s({,;])capability:\s*['"](read|view|list|access)['"]/m, requiresWrite: true, why: "a write command is gated by a READ capability — name the exact operational right" },
];

const WRITE_CALL = /entities\.[A-Za-z]+\.(create|update|updateMany|bulkUpdate|delete|deleteMany)\s*\(/;
const GUARDED_CALL = /authorizeCommand\s*\(/;
const TRUSTED_TARGET = /target_type\s*:/;
const HINT_ONLY_CALL = /resolveAuthority\s*\(/;
const CAPABILITY = /capability:\s*['"]([a-z_.]+)['"]/;

// Risk order for the migration backlog: decisions before administration.
const RISK_WEIGHT = [
  [/Decision|Vote|Sign|Issue/, 1],
  [/Meeting|Attendance|Quorum|Minutes|Approve/, 2],
  [/Document|Review|Instrument/, 3],
  [/Action|Escalat|Recus|Conflict|Delegat|Alternate|Term/, 4],
  [/Generate|Report|Export|Memory|Product|Scenario/, 5],
  [/Admin|Committee|Organization|Portal|Page|Config|Merge|Access/, 6],
];
const riskOf = (rel) => (RISK_WEIGHT.find(([re]) => re.test(rel)) || [null, 9])[1];
const shortName = (rel) => rel.replace(/^base44\/functions\//, "").replace(/\/entry\.ts$/, "").replace(/^base44\/shared\//, "shared/");

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
const rows = [];

for (const file of files) {
  const src = readFileSync(join(ROOT, file), "utf8");
  const rel = relative(ROOT, file);
  const fixture = FIXTURE_ALLOWLIST.test(rel);
  const policyModule = POLICY_MODULES.test(rel);
  const writes = WRITE_CALL.test(src);
  const guarded = GUARDED_CALL.test(src);
  // A command site is on the guarded path only when it names a TRUSTED TARGET through the guard.
  // Asking the kernel directly — or calling the guard without a target — is the migration backlog.
  const trustedTarget = guarded && TRUSTED_TARGET.test(src);
  // The invariant is about WRITES: a read-only probe (AuthorizeCommitteeAction, a Test* harness) may
  // ask the kernel directly and is not a command site at all. A file that WRITES while asking the
  // kernel directly — or through the guard without naming a target — is the migration backlog.
  const hintOnly = (HINT_ONLY_CALL.test(src) || !trustedTarget) && writes;
  const nameMatch = /(filter|find|some)\([^)]*\bmember_name\s*[:=]/.test(src);
  const readGate = /(^|[\s({,;])capability:\s*['"](read|view|list|access)['"]/m.test(src);
  const capability = (src.match(CAPABILITY) || [])[1] || null;

  for (const rule of ERRORS) {
    if (rule.requiresWrite && !writes) continue;
    if (rule.requiresWrite && (policyModule || fixture)) continue;
    if (rule.re.test(src) && !fixture) errors.push({ rel, id: rule.id, why: rule.why });
  }
  if (hintOnly) warnings.push({ rel, id: "scope-hint-only", why: "authority asked with a committee lookup hint and no trusted target — migrate to authorizeCommand" });
  // The completion gate: with --strict, a WRITE still authorized on a lookup hint is a blocking error.
  if (STRICT && writes && hintOnly && !fixture && !policyModule) {
    errors.push({ rel, id: "untrusted-target-write", why: "a write is authorized on a committee lookup hint instead of a trusted target" });
  }
  if (readGate && writes && !fixture && !policyModule) {
    warnings.push({ rel, id: "read-authorized-write", why: "a write command is gated by a read capability (ERROR above)" });
  }

  if (policyModule) continue;
  if (!writes && !guarded && !hintOnly) continue;
  const needs = [];
  if (hintOnly) needs.push("مرِّر السجل المستهدف عبر authorizeCommand");
  if (readGate && writes) needs.push("استبدل حق القراءة بفعل دقيق");
  if (nameMatch) needs.push("استبدل المطابقة بالاسم بمعرّف");
  rows.push({
    rel, risk: riskOf(rel),
    capability: guarded ? (capability || "—") : `${capability || "read"} (تلميح فقط)`,
    writes, trusted: trustedTarget && !hintOnly ? "سجل مستهدف" : "تلميح لجنة",
    needs: needs.length ? needs.join(" · ") : "—",
    guarded, trustedTarget, hintOnly, nameMatch, readGate,
    status: trustedTarget && !hintOnly && !(readGate && writes) && !nameMatch ? "مهاجر" : "قيد الترحيل",
  });
}

rows.sort((a, b) => a.risk - b.risk || shortName(a.rel).localeCompare(shortName(b.rel)));

// Coverage is reported as sets. Overlaps are shown explicitly, never summed as if unique.
const setOf = (pred) => new Set(rows.filter(pred).map((r) => r.rel));
const migrated = setOf((r) => r.status === "مهاجر");
const pending = setOf((r) => r.status !== "مهاجر");
const readGated = setOf((r) => r.readGate && r.writes);
const nameBased = setOf((r) => r.nameMatch);
const unionNeedingWork = new Set([...pending, ...readGated, ...nameBased]);
const intersect = (a, b) => [...a].filter((x) => b.has(x));
const sites = rows.length;

const ledger = [
  "# سجل مواضع الأوامر — ليان™ | AUTHORITY COMMAND LEDGER",
  "",
  "> ملف مُولَّد آليًا — لا يُحرَّر يدويًا. المصدر: `scripts/authority-guardrails.mjs`.",
  `> يُعاد توليده عند كل تشغيل للفحص الثابت، ويطابق النسخة \`authz-1.1.0\`.`,
  "",
  `- مواضع الأوامر المكتشفة: **${sites}**`,
  `- على المسار المحروس (\`authorizeCommand\` + سجل مستهدف): **${migrated.size}**`,
  `- تلميح لجنة فقط (بدون سجل مستهدف): **${pending.size}**`,
  `-كتابة محكومة بحق قراءة: **${readGated.size}**`,
  `- مطابقة بالاسم: **${nameBased.size}**`,
  "",
  "### التداخل (لا تُجمع القوائم كأنها مواضع فريدة)",
  "",
  `- اتحاد المواضع التي تحتاج عملًا: **${unionNeedingWork.size}** موضعًا فريدًا`,
  `- «تلميح فقط» ∩ «محكوم بقراءة»: ${intersect(pending, readGated).length} — ${intersect(pending, readGated).map(shortName).join(", ") || "—"}`,
  `- «تلميح فقط» ∩ «مطابقة بالاسم»: ${intersect(pending, nameBased).length} — ${intersect(pending, nameBased).map(shortName).join(", ") || "—"}`,
  `- «محكوم بقراءة» ∩ «مطابقة بالاسم»: ${intersect(readGated, nameBased).length} — ${intersect(readGated, nameBased).map(shortName).join(", ") || "—"}`,
  `- الثلاثة معًا: ${[...unionNeedingWork].filter((r) => pending.has(r) && readGated.has(r) && nameBased.has(r)).length}`,
  "",
  "### الجرد",
  "",
  "| ID | الوظيفة | العملية | يكتب؟ | الأصل الموثوق | الفعل المطلوب | الحارس | تطابق بالاسم؟ | محكوم بقراءة؟ | الحالة |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...rows.map((r, i) => `| CMD-${String(i + 1).padStart(2, "0")} | \`${shortName(r.rel)}\` | ${r.capability} | ${r.writes ? "نعم" : "لا"} | ${r.trusted} | ${r.needs} | ${r.guarded ? "authorizeCommand" : "—"} | ${r.nameMatch ? "نعم" : "لا"} | ${r.readGate && r.writes ? "نعم" : "لا"} | ${r.status} |`),
  "",
].join("\n");

writeFileSync(join(ROOT, "docs/AUTHORITY_COMMAND_LEDGER.md"), ledger, "utf8");

console.log(`authority-guardrails — scanned ${files.length} files`);
for (const e of errors) console.log(`ERROR [${e.id}] ${e.rel} — ${e.why}`);
for (const w of warnings) console.log(`WARN  [${w.id}] ${w.rel} — ${w.why}`);
console.log(`\nmigration ledger — command sites: ${sites}, guarded: ${migrated.size}, hint-only: ${pending.size}`);
console.log(`read-authorized writes: ${readGated.size}, name-based identity: ${nameBased.size}, union needing work: ${unionNeedingWork.size}`);
console.log(`ledger written → docs/AUTHORITY_COMMAND_LEDGER.md`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length > 0 ? 1 : 0);