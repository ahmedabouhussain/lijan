// proposalContent.ts — FROZEN PROPOSAL CONTENT and MATERIAL-CHANGE detection (proposal-content-1.0.0).
//
// D-061: the "proposal version" a round was frozen against was `String(decision.updated_date)` — a
// timestamp, not content. It changed on every status write (opening the vote itself rewrote it), so
// the round named a version nothing could reproduce, and an edit to the proposal text after the round
// opened was undetectable: members could vote on one text and a different text could be issued.
//
// This module states ONCE:
//   • which fields ARE the proposal a member votes on (the voted text, never status or tallies);
//   • how that content is canonicalized and fingerprinted (SHA-256 over a fixed-order canonical form);
//   • what counts as a MATERIAL change between two versions — a changed amount, percentage or date,
//     an added or removed negation/exception, a changed execution owner, deadline or legal basis —
//     so it is highlighted before voting rather than discovered after issuance;
//   • the binding verdict a vote and an issuance must pass: the content NOW must be the content the
//     round froze, and the frozen copy must still match its own fingerprint.
//
// A fingerprint is a deterministic content digest — not proof of legal validity or trusted time.

import { MATERIAL_CHANGE_VERSION, scanProposal, summarizeScan } from './materialChange.ts';

export const PROPOSAL_CONTENT_VERSION = "proposal-content-1.0.0";

/** The voted content, in a FIXED order. Status, tallies, outcome and issuance fields are not proposal. */
export const PROPOSAL_FIELDS = [
  "title", "title_ar", "title_en",
  "proposal", "proposal_en",
  "legal_basis", "legal_basis_en",
  "alternatives",
  "owner_name", "owner_name_en",
  "deadline",
  "dependencies", "dependencies_en",
];

const FIELD_CLASS: Record<string, string> = {
  owner_name: "responsibility", owner_name_en: "responsibility",
  deadline: "deadline",
  legal_basis: "legal_basis", legal_basis_en: "legal_basis",
};

export const FIELD_LABELS: Record<string, { ar: string; en: string }> = {
  title: { ar: "العنوان", en: "Title" }, title_ar: { ar: "العنوان (عربي)", en: "Title (Arabic)" }, title_en: { ar: "العنوان (إنجليزي)", en: "Title (English)" },
  proposal: { ar: "نص المقترح", en: "Proposal text" }, proposal_en: { ar: "نص المقترح (إنجليزي)", en: "Proposal text (English)" },
  legal_basis: { ar: "السند النظامي", en: "Legal basis" }, legal_basis_en: { ar: "السند النظامي (إنجليزي)", en: "Legal basis (English)" },
  alternatives: { ar: "البدائل", en: "Alternatives" },
  owner_name: { ar: "مالك التنفيذ", en: "Execution owner" }, owner_name_en: { ar: "مالك التنفيذ (إنجليزي)", en: "Execution owner (English)" },
  deadline: { ar: "المهلة", en: "Deadline" },
  dependencies: { ar: "التبعيات", en: "Dependencies" }, dependencies_en: { ar: "التبعيات (إنجليزي)", en: "Dependencies (English)" },
};

const norm = (v: any) => {
  if (v === null || v === undefined) return null;
  const s = String(v).normalize("NFC").replace(/\s+/g, " ").trim();
  return s.length ? s : null;
};

/** Canonical proposal: fixed field order, normalized whitespace, empty → null. */
export function canonicalProposal(decision: any) {
  const out: Record<string, string | null> = {};
  for (const f of PROPOSAL_FIELDS) out[f] = norm(decision?.[f]);
  return out;
}

export function serializeProposal(canonical: Record<string, string | null>) {
  const ordered: Record<string, string | null> = {};
  for (const f of PROPOSAL_FIELDS) ordered[f] = canonical?.[f] ?? null;
  return JSON.stringify(ordered);
}

export async function proposalDigest(canonical: Record<string, string | null>) {
  const bytes = new TextEncoder().encode(serializeProposal(canonical));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A short, readable version label derived from the digest (the digest itself stays authoritative). */
export const versionLabel = (digest: string | null) => (digest ? `pc:${digest.replace("sha256:", "").slice(0, 12)}` : null);

// ── Material-change detection ───────────────────────────────────────────────────────────────────

export const toAsciiDigits = (s: string) => s
  .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
  .replace(/\u066B/g, ".")   // Arabic decimal separator
  .replace(/\u066C/g, ",")   // Arabic thousands separator
  .replace(/\u066A/g, "%");  // Arabic percent sign

const DATE_RE = /\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g;
const NUMBER_RE = /\d+(?:,\d{3})*(?:\.\d+)?%?/g;

function extractDates(text: string) {
  return (toAsciiDigits(text).match(DATE_RE) || []).sort();
}
function extractAmounts(text: string) {
  const withoutDates = toAsciiDigits(text).replace(DATE_RE, " ");
  return (withoutDates.match(NUMBER_RE) || []).map((n) => n.replace(/,/g, "")).sort();
}

const NEGATIONS_AR = new Set(["لا", "ليس", "ليست", "غير", "لم", "لن", "عدم", "دون", "بدون", "إلا", "الا", "باستثناء", "عدا", "يحظر", "يُحظر", "يمنع", "يُمنع", "ممنوع", "محظور"]);
const NEGATIONS_EN = new Set(["not", "no", "never", "without", "except", "unless", "none", "neither", "nor", "cannot", "prohibited", "excluding", "notwithstanding"]);

function negationTokens(text: string) {
  const out: string[] = [];
  const words = text.toLowerCase().replace(/n't\b/g, " not").split(/[\s.,;:!?()«»"'\-–—/\\[\]{}،؛؟]+/).filter(Boolean);
  for (const raw of words) {
    const w = raw.replace(/[\u064B-\u0652\u0670]/g, ""); // strip Arabic diacritics
    if (NEGATIONS_EN.has(w) || NEGATIONS_AR.has(w)) { out.push(w); continue; }
    // Arabic proclitics: و / ف / ب / ل attached to a negation (ولا · فلا · وعدم · بعدم · ولم · بدون)
    if (/^[وفبل]/.test(w) && w.length > 2) {
      const rest = w.slice(1);
      if (NEGATIONS_AR.has(rest)) { out.push(rest); continue; }
      if (/^[وفبل]/.test(rest) && NEGATIONS_AR.has(rest.slice(1))) out.push(rest.slice(1));
    }
  }
  return out.sort();
}

const multisetDiff = (a: string[], b: string[]) => {
  const count = new Map<string, number>();
  for (const x of a) count.set(x, (count.get(x) || 0) + 1);
  const added: string[] = [];
  for (const x of b) {
    const c = count.get(x) || 0;
    if (c > 0) count.set(x, c - 1); else added.push(x);
  }
  const removed: string[] = [];
  for (const [x, c] of count) for (let i = 0; i < c; i++) removed.push(x);
  return { added, removed };
};

/** Findings for ONE field. A finding is material unless it is pure wording. */
export function fieldFindings(field: string, before: string | null, after: string | null) {
  const findings: any[] = [];
  const b = before || "", a = after || "";
  const klass = FIELD_CLASS[field];
  if (klass === "responsibility") findings.push({ type: "responsibility_changed", material: true });
  if (klass === "deadline") findings.push({ type: "deadline_changed", material: true });
  if (klass === "legal_basis") findings.push({ type: "legal_basis_changed", material: true });

  const amounts = multisetDiff(extractAmounts(b), extractAmounts(a));
  if (amounts.added.length || amounts.removed.length) findings.push({ type: "amount_changed", material: true, before: amounts.removed, after: amounts.added });

  const dates = multisetDiff(extractDates(b), extractDates(a));
  if (dates.added.length || dates.removed.length) findings.push({ type: "date_changed", material: true, before: dates.removed, after: dates.added });

  const neg = multisetDiff(negationTokens(b), negationTokens(a));
  if (neg.added.length) findings.push({ type: "negation_added", material: true, tokens: neg.added });
  if (neg.removed.length) findings.push({ type: "negation_removed", material: true, tokens: neg.removed });

  if (!before && after) findings.push({ type: "field_added", material: !!klass });
  if (before && !after) findings.push({ type: "field_removed", material: true });
  if (!findings.length) findings.push({ type: "wording_changed", material: false });
  return findings;
}

/** Compare two canonical proposals. Unchanged fields are not reported. */
export function compareProposals(before: Record<string, any> | null, after: Record<string, any> | null) {
  const fields: any[] = [];
  for (const f of PROPOSAL_FIELDS) {
    const b = before?.[f] ?? null, a = after?.[f] ?? null;
    if (b === a) continue;
    const findings = fieldFindings(f, b, a);
    fields.push({ field: f, label: FIELD_LABELS[f] || { ar: f, en: f }, before: b, after: a, material: findings.some((x) => x.material), findings });
  }
  // The field diff says WHICH field moved; the materiality scan (material-change-1.0.0) says whether the
  // change is material in meaning — a unit change with the same number, a value moved to another subject,
  // a modality or scope shift, or a changed normative reference (D-087). Both travel together, so the
  // pre-vote screen, the round's stored findings and an export can never disagree.
  const semantic = scanProposal({ before, after, fields: PROPOSAL_FIELDS });
  for (const f of fields) {
    const found = (semantic.fields || []).find((s: any) => s.field === f.field);
    const materialFindings = (found?.findings || []).filter((x: any) => x.material);
    f.semantic_findings = found?.findings || [];
    if (materialFindings.length) f.material = true;
  }
  const material = fields.filter((x) => x.material).length;
  return {
    contract_version: PROPOSAL_CONTENT_VERSION,
    materiality_contract_version: MATERIAL_CHANGE_VERSION,
    changed: fields.length > 0,
    material: material > 0 || (semantic.cross_field_findings || []).length > 0,
    material_count: material,
    textual_count: fields.length - material,
    semantic,
    cross_field_findings: semantic.cross_field_findings || [],
    fields,
  };
}

/** Compact one-line strings for storage on a round record (no prose, codes only). */
export function summarizeChanges(diff: any) {
  const fieldCodes = (diff?.fields || []).map((f: any) => `${f.field}:${f.findings.map((x: any) => x.type).join("+")}`);
  return [...fieldCodes, ...summarizeScan(diff?.semantic)];
}

export const CONTENT_REFUSALS: Record<string, any> = {
  no_frozen_content: {
    ar: "دورة التصويت هذه فُتحت قبل تثبيت نص المقترح، فلا يُعرف النص الذي يُصوَّت عليه. يلزم إعادة فتح التصويت لتجميد النص قبل تسجيل الأصوات أو الإصدار.",
    en: "This voting round was opened before the proposal text was frozen, so the text being voted on is unknown. The vote must be reopened to freeze the text before ballots or issuance.",
  },
  stale_content: {
    ar: "تغيّر نص المقترح بعد فتح دورة التصويت. لا يُسجَّل صوت ولا يصدر قرار على نص غير الذي جُمِّد؛ تُراجَع التغييرات وتُفتح دورة جديدة.",
    en: "The proposal text changed after this voting round opened. No ballot is recorded and nothing is issued on a text other than the one frozen; the changes are reviewed and a new round is opened.",
  },
  frozen_content_tampered: {
    ar: "النسخة المجمّدة من المقترح لا تطابق بصمتها المسجّلة؛ لا يُعتمد عليها.",
    en: "The frozen copy of the proposal no longer matches its recorded fingerprint; it cannot be relied on.",
  },
};

/**
 * The binding verdict a ballot and an issuance must pass.
 *   bound            — the content now is the content the round froze, and the frozen copy verifies
 *   stale            — the proposal changed after the round froze (changes returned, material flagged)
 *   unbound_legacy   — the round predates content freezing
 *   tampered         — the stored frozen copy does not re-hash to its own fingerprint
 */
export async function contentBinding({ round, decision }: { round: any; decision: any }) {
  const current = canonicalProposal(decision);
  const current_sha256 = await proposalDigest(current);
  if (!round?.proposal_sha256 || !round?.proposal_content) {
    return { state: "unbound_legacy", code: "no_frozen_content", current_sha256, frozen_sha256: null, changes: null, contract_version: PROPOSAL_CONTENT_VERSION };
  }
  let frozen: any = null;
  try { frozen = JSON.parse(round.proposal_content); } catch { frozen = null; }
  const rehash = frozen ? await proposalDigest(frozen) : null;
  if (!frozen || rehash !== round.proposal_sha256) {
    return { state: "tampered", code: "frozen_content_tampered", current_sha256, frozen_sha256: round.proposal_sha256, changes: null, contract_version: PROPOSAL_CONTENT_VERSION };
  }
  if (current_sha256 !== round.proposal_sha256) {
    return { state: "stale", code: "stale_content", current_sha256, frozen_sha256: round.proposal_sha256, changes: compareProposals(frozen, current), contract_version: PROPOSAL_CONTENT_VERSION };
  }
  return { state: "bound", code: null, current_sha256, frozen_sha256: round.proposal_sha256, changes: null, contract_version: PROPOSAL_CONTENT_VERSION };
}

/** The refusal body for a binding that is not `bound`. */
export function bindingRefusal(binding: any, correlation_id?: string) {
  const text = CONTENT_REFUSALS[binding.code] || CONTENT_REFUSALS.stale_content;
  return {
    error: text.en, error_ar: text.ar, code: binding.code,
    message: { ar: text.ar, en: text.en },
    content_binding: {
      state: binding.state, frozen_sha256: binding.frozen_sha256, current_sha256: binding.current_sha256,
      material: binding.changes?.material ?? null, changes: binding.changes?.fields || null,
      contract_version: PROPOSAL_CONTENT_VERSION,
    },
    decided: "refused_before_write",
    correlation_id: correlation_id || null,
  };
}