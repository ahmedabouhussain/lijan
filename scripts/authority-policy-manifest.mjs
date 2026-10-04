#!/usr/bin/env node
// authority-policy-manifest.mjs — writes base44/shared/authorityPolicyManifest.json from the policy
// source itself, so the manifest can never drift from the code it describes.
//
// It records: version, the version it supersedes, the class of change, the change list, the source
// hash of BOTH policy modules, the build time, the capability policy in force, the functions that
// are linked to this version, the tests that belong to it, and — because the change is
// security-material — that evidence produced under the previous version is INVALIDATED.
// Run: node scripts/authority-policy-manifest.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const KERNEL = "base44/shared/authorityKernel.ts";
const GUARD = "base44/shared/commandGuard.ts";
const OUT = "base44/shared/authorityPolicyManifest.json";

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const kernel = read(KERNEL);
const guard = read(GUARD);
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");

const version = (kernel.match(/export const AUTHORITY_POLICY_VERSION\s*=\s*"([^"]+)"/) || [])[1];
if (!version) throw new Error("AUTHORITY_POLICY_VERSION not found in the kernel");
const buildBlock = kernel.slice(kernel.indexOf("AUTHORITY_POLICY_BUILD"));
const supersedes = (buildBlock.match(/supersedes:\s*"([^"]+)"/) || [])[1] || null;
const changeClass = (buildBlock.match(/change_class:\s*"([^"]+)"/) || [])[1] || null;
const invalidates = /invalidates_prior_evidence:\s*true/.test(buildBlock);
const changes = [...(buildBlock.slice(buildBlock.indexOf("changes:")).matchAll(/"([^"]{12,})"/g))]
  .map((m) => m[1]).filter((s) => !s.startsWith("authz-"));

const listFrom = (name) => {
  const at = kernel.indexOf(`export const ${name}`);
  if (at < 0) return [];
  const body = kernel.slice(at, kernel.indexOf("];", at));
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
};
const privateList = (name) => {
  const at = kernel.indexOf(`const ${name}`);
  if (at < 0) return [];
  const body = kernel.slice(at, kernel.indexOf("];", at));
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
};

const walk = (dir, files = []) => {
  for (const e of readdirSync(join(ROOT, dir))) {
    const full = join(dir, e);
    if (statSync(join(ROOT, full)).isDirectory()) walk(full, files);
    else if (full.endsWith(".ts")) files.push(full);
  }
  return files;
};

const linkedFunctions = walk("base44/functions")
  .filter((f) => /authorityKernel\.ts|commandGuard\.ts/.test(readFileSync(join(ROOT, f), "utf8")))
  .map((f) => relative("base44/functions", f).replace("/entry.ts", ""))
  .sort();

const testFunction = "TestAuthorizationGuard";
const testSource = read(join("base44/functions", testFunction, "entry.ts"));
const caseCount = (prefix) => (testSource.match(new RegExp(`id: ["']${prefix}`, "g")) || []).length;

const manifest = {
  version,
  supersedes,
  change_class: changeClass,
  built_at: new Date().toISOString(),
  source: {
    kernel: { path: KERNEL, sha256: sha(kernel) },
    guard: { path: GUARD, sha256: sha(guard) },
    combined_sha256: sha(kernel + guard),
  },
  policy: {
    delegable_capabilities: listFrom("DELEGABLE_CAPABILITIES"),
    operational_capabilities: listFrom("OPERATIONAL_CAPABILITIES"),
    self_service_capabilities: privateList("SELF_SERVICE_CAPABILITIES"),
    recusal_blocked_capabilities: privateList("RECUSAL_BLOCKED"),
    admin_read_ceiling: listFrom("ADMIN_READ_CEILING"),
    decision_rights_separated: [
      "vote ≠ approve ≠ issue",
      "decision.sign_image is not decision.digital_sign",
      "decision.digital_sign is granted to NOBODY until an approved policy names the trust service",
    ],
  },
  changes,
  evidence: {
    invalidates_prior_evidence: invalidates,
    invalidated_versions: invalidates ? [supersedes].filter(Boolean) : [],
    note: invalidates
      ? "نتائج أي إصدار سابق لا تُحمل إلى هذا الإصدار: كل اختبارات السلطة تُعاد على هذه النسخة المجمّدة."
      : null,
  },
  linked_functions: linkedFunctions,
  tests: {
    function: testFunction,
    suites: {
      role_tests: caseCount("AUTH-"),
      positive_tests: caseCount("POS-"),
      fail_closed_tests: caseCount("FCL-"),
    },
    note: "الفصل صريح: هذه اختبارات أدوار وصلاحيات، وليست اختبارات أداء.",
  },
};

writeFileSync(join(ROOT, OUT), JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`authority policy manifest → ${OUT}`);
console.log(`  version ${version}  (supersedes ${supersedes}, class ${changeClass})`);
console.log(`  kernel sha256 ${manifest.source.kernel.sha256.slice(0, 16)}…  combined ${manifest.source.combined_sha256.slice(0, 16)}…`);
console.log(`  linked functions ${linkedFunctions.length}, tests role ${manifest.tests.suites.role_tests} / positive ${manifest.tests.suites.positive_tests} / fail-closed ${manifest.tests.suites.fail_closed_tests}`);
console.log(`  prior evidence invalidated: ${invalidates}`);