// decisionIntegrity.ts — the ONE answer to "is this decision package fit to be issued?"
//
// Raised by P0-01 in the national delivery brief: an issued decision could carry a 0-seat eligible
// electorate against 13 accepted votes, 5 of 6 mandatory items, empty proof links and no issue date,
// and still present itself as issued. This module is the single authority on that question — a PURE
// evaluator (no I/O) so the same call is exercised by commands, by the read path and by tests.
//
// Two things are deliberately kept apart:
//   • the RULE   — which mandatory items exist, and whether signatures are required at all
//   • the FACTS  — the seats, ballots, attendance and signatures actually recorded
// A requirement whose evidence cannot be established is MISSING, never satisfied. An explicit
// "none are required" policy is a DIFFERENT fact from missing evidence, and only that explicit
// declaration satisfies the signature requirement.
//
// The digest produced here is a DIGEST: a deterministic content fingerprint. It is NOT proof of
// legal validity, trusted time or independently verified tamper resistance, and the assurance it
// carries is reported alongside it rather than implied.
//
// POLICY VERSION: decision-integrity-1.1.0 (security material — a change invalidates prior evidence).
// 1.1.0 (5 Oct 2026): two corrections, both reported in the 5 October review.
//   • QUORUM is counted over DISTINCT ELIGIBLE VOTING SEATS, not over attendance rows: a duplicated
//     row for one seat can no longer inflate it, and a present observer or advisor — who holds no
//     vote — no longer makes a quorum. Rows that were ignored are named with their reason.
//   • A stored evidence_manifest is VERIFIED against its own manifest_sha256 (verifyStoredManifest).
//     The previous comparison in issuanceVerdict was a no-op, so an altered package still read as
//     intact. Evidence produced under 1.0.0 is INVALIDATED and must be re-run against 1.1.0.

export const INTEGRITY_POLICY_VERSION = "decision-integrity-1.1.0";

/** The mandatory items of an issuance package. `satisfied_when` is evaluated, never assumed. */
export const ISSUANCE_REQUIREMENTS = [
  { code: "proposal_frozen", ar: "نص المقترح المعتمد", en: "Approved proposal text" },
  { code: "legal_basis", ar: "السند القانوني", en: "Legal basis" },
  { code: "attendance_record", ar: "سجل الحضور والنصاب", en: "Attendance and quorum record" },
  { code: "vote_certification", ar: "شهادة تصويت مطابقة للهيئة الناخبة", en: "Vote certification reconciled with the electorate" },
  { code: "proof_links", ar: "روابط الأدلة والمرفقات", en: "Evidence and attachment links" },
  { code: "signatures_per_policy", ar: "التوقيعات أو نص صريح بعدم اشتراكها", en: "Signatures, or an explicit policy that none are required" },
];

export const ISSUANCE_COPY = {
  blocked_ar: "لا يمكن إصدار القرار قبل استكمال المتطلبات الإلزامية الموضحة أدناه.",
  blocked_en: "This decision cannot be issued until the mandatory requirements below are met.",
  changed_ar: "تغيّرت النسخة منذ فتحها. راجع النسخة الحالية قبل التصويت أو الاعتماد.",
  changed_en: "This version changed since it was opened. Review the current version before voting or approving.",
  unverified_ar: "بيانات الإصدار غير متسقة مع الأدلة المسجلة ولا تُعدّ موثّقة.",
  unverified_en: "The issuance record does not reconcile with the stored evidence and is not verified.",
};

const nonEmpty = (v: any): boolean => typeof v === "string" && v.trim().length > 0;
const dayOf = (v: any): string => (typeof v === "string" ? v.slice(0, 10) : "");

/** Seats that may vote: active appointment, voting right not withdrawn, not currently recused. */
export function eligibleSeats({ memberships = [], recusals = [], asOf = null } = {}) {
  const on = dayOf(asOf) || new Date().toISOString().slice(0, 10);
  const recusedIds = new Set();
  const recusedUsers = new Set();
  for (const r of recusals || []) {
    if (r.status && r.status !== "active") continue;
    if (r.start_time && dayOf(r.start_time) > on) continue;
    if (r.end_time && dayOf(r.end_time) < on) continue;
    for (const id of [r.membership_id, r.member_id, r.committee_membership_id]) if (id) recusedIds.add(id);
    for (const id of [r.member_user_id, r.user_id, r.person_id]) if (id) recusedUsers.add(id);
  }
  const seats = [];
  const excluded = [];
  for (const m of memberships || []) {
    if (m.status && m.status !== "active") continue;
    const withdrawn = m.voting_right === false;
    const recused = recusedIds.has(m.id) || (m.user_id && recusedUsers.has(m.user_id));
    if (withdrawn || recused) excluded.push({ seat_id: m.id, reason: withdrawn ? "voting_right_withdrawn" : "recused" });
    else seats.push({ seat_id: m.id, user_id: m.user_id || null, role: m.role || null });
  }
  return { size: seats.length, seats, excluded, basis: "active seats with a voting right, less recusals" };
}

/** Every ballot is attributed to ONE eligible seat, at most once. */
export function reconcileBallots({ votes = [], seats = [] } = {}) {
  const seatIds = new Set(seats.map((s) => s.seat_id));
  const userIds = new Set(seats.map((s) => s.user_id).filter(Boolean));
  const seenSeat = new Set();
  const seenUser = new Set();
  const accepted = [];
  const duplicates = [];
  const ineligible = [];
  const malformed = [];
  for (const v of votes || []) {
    const seat = v.voter_membership_id || null;
    const user = v.voter_user_id || null;
    const choice = v.vote_choice;
    if (!["for", "against", "abstain"].includes(choice)) { malformed.push({ vote_id: v.id, reason: "no_valid_choice" }); continue; }
    // A vote attributable to NO seat and NO person cannot be counted at all: an anonymous ballot
    // is exactly the shape a fabricated 13-vote tally takes.
    if (!seat && !user) { malformed.push({ vote_id: v.id, reason: "no_seat_and_no_person" }); continue; }
    if (seat && !seatIds.has(seat) && !(user && userIds.has(user))) { ineligible.push({ vote_id: v.id, seat_id: seat, reason: "seat_not_in_electorate" }); continue; }
    if (!seat && user && !userIds.has(user)) { ineligible.push({ vote_id: v.id, user_id: user, reason: "person_not_in_electorate" }); continue; }
    if (seat && seenSeat.has(seat)) { duplicates.push({ vote_id: v.id, seat_id: seat, reason: "seat_voted_twice" }); continue; }
    if (user && seenUser.has(user)) { duplicates.push({ vote_id: v.id, user_id: user, reason: "person_voted_twice" }); continue; }
    if (seat) seenSeat.add(seat);
    if (user) seenUser.add(user);
    accepted.push({ vote_id: v.id, seat_id: seat, user_id: user, choice, method: v.vote_method || "open", voted_at: v.voted_at || null });
  }
  const tally = { for: 0, against: 0, abstain: 0 };
  for (const b of accepted) tally[b.choice] += 1;
  return {
    accepted, duplicates, ineligible, malformed,
    accepted_count: accepted.length,
    tally,
    cast: accepted.filter((b) => b.choice !== "abstain").length,
  };
}

/**
 * The seats PRESENT, counted as evidence rather than as rows: only a DISTINCT seat that is an
 * eligible voting seat of the electorate counts toward quorum. So
 *   • a second row for the same seat (double entry, a corrected row not replaced) is IGNORED;
 *   • an observer or advisor — present, but not in the electorate and holding no vote — is IGNORED;
 *   • a present row with no seat identity is IGNORED, because it cannot be attributed to anyone.
 * Every ignored row is returned with its reason, so a quorum figure is always accounted for.
 */
export function presentSeats({ attendance = [], seats = [] }: { attendance?: any[]; seats?: any[] } = {}) {
  const eligible = new Set((seats || []).map((s) => s.seat_id));
  const seen = new Set();
  const seat_ids = [];
  const ignored = [];
  for (const a of attendance || []) {
    if (!["present", "late"].includes(a.attendance_status)) continue;
    const seat = a.member_id || null;
    if (!seat) { ignored.push({ row_id: a.id || null, reason: "no_seat_identity" }); continue; }
    if (!eligible.has(seat)) { ignored.push({ seat_id: seat, reason: "not_an_eligible_voting_seat" }); continue; }
    if (seen.has(seat)) { ignored.push({ seat_id: seat, reason: "duplicate_row_for_one_seat" }); continue; }
    seen.add(seat);
    seat_ids.push(seat);
  }
  return {
    count: seat_ids.length,
    seat_ids,
    ignored,
    basis: "distinct eligible voting seats marked present or late; duplicate rows collapse and non-voting seats do not count",
  };
}

/**
 * Whether signatures are required is POLICY, read from the committee/mandate. An explicit
 * 'not_required' is recorded as such; anything else is treated as REQUIRED but unmet until
 * evidence exists — missing data is never read as permission.
 */
export function signatureRequirement({ committee = {}, signatures = [] } = {}) {
  const declared = committee.signature_requirement || committee.mandate_signature_requirement || null;
  const present = (signatures || []).filter((s) => !s.status || s.status === "active");
  if (declared === "not_required") {
    return { requirement: "not_required", declared: true, required_count: 0, present_count: present.length, satisfied: true, basis: "committee policy declares signatures not required" };
  }
  const requiredCount = Number.isFinite(Number(committee.required_signatures)) && Number(committee.required_signatures) > 0
    ? Number(committee.required_signatures) : 1;
  return {
    requirement: declared === "required" ? "required" : "required",
    declared: declared === "required",
    required_count: requiredCount,
    present_count: present.length,
    satisfied: present.length >= requiredCount,
    basis: declared === "required" ? "committee policy requires signatures" : "no policy declares signatures unnecessary — evidence is missing, which is not permission",
  };
}

function thresholdFor(rule, cast, eligible) {
  switch (rule) {
    case "two_thirds": return { needed: Math.ceil((cast * 2) / 3), basis: "two-thirds of votes cast" };
    case "unanimous": return { needed: cast, basis: "unanimous of votes cast" };
    case "chair_decides": return { needed: 1, basis: "the chair decides" };
    case "simple_majority":
    default: return { needed: Math.floor(cast / 2) + 1, basis: "simple majority of votes cast" };
  }
}

/**
 * The ONE readiness decision. Pure: give it the facts, read the verdict. `blockers` is the
 * evidence — an empty list is the only thing that permits issuance.
 */
export function evaluateIssuanceReadiness({
  decision = {}, committee = {}, memberships = [], recusals = [], votes = [],
  attendance = [], signatures = [], proof_links = [], now = null,
} = {}) {
  const asOf = now || new Date().toISOString();
  const electorate = eligibleSeats({ memberships, recusals, asOf });
  const ballots = reconcileBallots({ votes, seats: electorate.seats });
  const quorumRequired = Number(committee.quorum_count || decision.quorum_required || 0) || 0;
  const present = presentSeats({ attendance, seats: electorate.seats });
  const presentCount = present.count;
  const quorumMet = quorumRequired > 0 ? presentCount >= quorumRequired : present.count > 0;
  const threshold = thresholdFor(committee.voting_rule, ballots.cast, electorate.size);
  const sig = signatureRequirement({ committee, signatures });

  const links = (proof_links || []).filter(nonEmpty);
  const satisfied = {
    proposal_frozen: nonEmpty(decision.proposal) || nonEmpty(decision.proposal_en) || nonEmpty(decision.outcome) || nonEmpty(decision.outcome_en),
    legal_basis: nonEmpty(decision.legal_basis) || nonEmpty(decision.legal_basis_en) || nonEmpty(committee.mandate) || nonEmpty(committee.mandate_id),
    attendance_record: (attendance || []).length > 0,
    vote_certification: ballots.accepted_count > 0,
    proof_links: links.length > 0,
    signatures_per_policy: sig.satisfied,
  };
  const missing = ISSUANCE_REQUIREMENTS.filter((r) => !satisfied[r.code]).map((r) => r.code);
  const completeness = { required: ISSUANCE_REQUIREMENTS.length, satisfied: ISSUANCE_REQUIREMENTS.length - missing.length, missing };

  const blockers = [];
  const block = (code: string, ar: string, en: string, requirement: string | null = null) => blockers.push({ code, requirement, ar, en });

  // ── The electorate/ballot contradiction that P0-01 exposed ──
  if (electorate.size === 0) {
    block("no_electorate", "لا توجد هيئة ناخبة مؤهلة مسجّلة لهذا القرار.", "No eligible electorate is recorded for this decision.", "vote_certification");
  }
  if (ballots.ineligible.length > 0) {
    block("ineligible_ballot", "توجد أصوات مسجّلة لمقاعد أو أشخاص خارج الهيئة الناخبة.", "Ballots are recorded for seats or people outside the eligible electorate.", "vote_certification");
  }
  if (ballots.accepted_count > electorate.size && electorate.size > 0) {
    block("ballots_exceed_electorate", "عدد الأصوات المقبولة يتجاوز عدد المقاعد المؤهلة.", "Accepted ballots exceed the number of eligible seats.", "vote_certification");
  }
  if (ballots.duplicates.length > 0) {
    block("duplicate_seat_ballot", "صوّت مقعد أو شخص أكثر من مرة في الجولة نفسها.", "A seat or person voted more than once in the same round.", "vote_certification");
  }
  if (ballots.malformed.length > 0) {
    block("malformed_ballot", "سجلات تصويت بلا اختيار صحيح أو بلا هوية مقعد.", "Ballot records carry no valid choice or no seat identity.", "vote_certification");
  }
  const declaredTally = { for: Number(decision.vote_for || 0), against: Number(decision.vote_against || 0), abstain: Number(decision.vote_abstain || 0) };
  const declaredTotal = declaredTally.for + declaredTally.against + declaredTally.abstain;
  if (declaredTotal > 0 && (declaredTally.for !== ballots.tally.for || declaredTally.against !== ballots.tally.against || declaredTally.abstain !== ballots.tally.abstain)) {
    block("tally_mismatch", "نتيجة التصويت المسجلة لا تطابق الأصوات المقبولة.", "The recorded vote result does not reconcile with the accepted ballots.", "vote_certification");
  }
  if (!quorumMet) {
    block("quorum_not_met", "لم يكتمل النصاب المقرر لهذا الاجتماع.", "The quorum required for this meeting was not met.", "attendance_record");
  }
  if (ballots.tally.for < threshold.needed && ballots.cast > 0) {
    block("threshold_not_met", "لم تتحقق الأغلبية المقررة في لائحة اللجنة.", "The threshold set by the committee's voting rule was not reached.", "vote_certification");
  }
  for (const code of missing) {
    const req = ISSUANCE_REQUIREMENTS.find((r) => r.code === code);
    const already = blockers.some((b) => b.requirement === code);
    if (!already) block(`incomplete_${code}`, `المتطلب الإلزامي غير مستوفى: ${req.ar}.`, `Mandatory requirement not satisfied: ${req.en}.`, code);
  }
  if (decision.status === "issued" && !nonEmpty(decision.issued_at)) {
    block("issued_without_date", "القرار مُعلن كصادر دون تاريخ إصدار خادمي.", "The decision presents as issued without a server-issued date.");
  }

  const manifest_input = {
    policy_version: INTEGRITY_POLICY_VERSION,
    decision_id: decision.id || null,
    committee_id: committee.id || decision.committee_id || null,
    decision_number: decision.decision_number || null,
    proposal_digest_source: { proposal: decision.proposal || null, proposal_en: decision.proposal_en || null, legal_basis: decision.legal_basis || null },
    voting_rule: committee.voting_rule || null,
    quorum: {
      required: quorumRequired, present: presentCount, met: quorumMet,
      present_seats: present.seat_ids.slice().sort(),
      ignored_attendance_rows: present.ignored.length,
    },
    electorate: { size: electorate.size, seat_ids: electorate.seats.map((s) => s.seat_id).sort(), excluded: electorate.excluded },
    ballots: { accepted: ballots.accepted.map((b) => ({ seat: b.seat_id, choice: b.choice, method: b.method })).sort((a, b) => String(a.seat).localeCompare(String(b.seat))), tally: ballots.tally, excluded_count: ballots.ineligible.length + ballots.duplicates.length + ballots.malformed.length },
    threshold,
    completeness,
    signatures: sig,
    proof_link_count: links.length,
    source_meeting_id: decision.meeting_id || null,
  };

  return {
    policy_version: INTEGRITY_POLICY_VERSION,
    evaluated_at: asOf,
    ready: blockers.length === 0,
    blockers,
    completeness,
    electorate,
    ballots,
    quorum: { required: quorumRequired, present: presentCount, met: quorumMet, seats_present: present.seat_ids, ignored_rows: present.ignored, basis: present.basis },
    threshold,
    signatures: sig,
    manifest_input,
  };
}

/** Canonical, key-sorted JSON — the same package always produces the same bytes. */
export function canonicalManifest(input: any): string {
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.keys(v).sort().reduce((acc: any, k: string) => { acc[k] = walk(v[k]); return acc; }, {});
    }
    return v === undefined ? null : v;
  };
  return JSON.stringify(walk(input));
}

/** Deterministic content fingerprint. A DIGEST — see the assurance note at the top of this file. */
export async function manifestDigest(canonical: string): Promise<string> {
  const bytes = new TextEncoder().encode(canonical);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const ASSURANCE = {
  level: "content_digest",
  ar: "محتوى مُبصَّم (بصمة SHA-256) — وليس إثباتًا للصلاحية القانونية أو وقت موثوق أو مقاومة تعديل مستقلة.",
  en: "Content digest (SHA-256) — not proof of legal validity, trusted time or independently verified tamper resistance.",
};

/**
 * What a READER is allowed to conclude about a record that presents as issued. This runs on every
 * read of an issued decision so a clean badge can never sit over contradictory evidence, and so the
 * contradiction is SHOWN rather than relabelled away.
 */
export async function verifyStoredManifest(stored: any) {
  if (!stored) return { verified: false, code: "no_snapshot", computed: null, declared: null };
  const declared = nonEmpty(stored.manifest_sha256) ? stored.manifest_sha256 : null;
  const manifest = nonEmpty(stored.evidence_manifest) ? stored.evidence_manifest : null;
  if (!manifest) return { verified: false, code: "manifest_missing", computed: null, declared };
  if (!declared) return { verified: false, code: "digest_missing", computed: null, declared: null };
  // The stored manifest is re-canonicalised before hashing, so a manifest that is merely re-ordered
  // still verifies while any change of CONTENT does not. Verification is recomputation, never a
  // comparison of a value with itself.
  let canonical = manifest;
  try { canonical = canonicalManifest(JSON.parse(manifest)); } catch { canonical = manifest; }
  const computed = await manifestDigest(canonical);
  return {
    verified: computed === declared,
    code: computed === declared ? null : "manifest_digest_mismatch",
    computed,
    declared,
    basis: "the stored evidence_manifest is re-canonicalised and re-hashed; the result is compared with the stored manifest_sha256",
  };
}

/**
 * What a READER is allowed to conclude about a record that presents as issued. This runs on every
 * read of an issued decision so a clean badge can never sit over contradictory evidence, and so the
 * contradiction is SHOWN rather than relabelled away.
 *
 * `manifest_check` is the result of verifyStoredManifest (async, because hashing is). When it is
 * absent the package is reported as unverified rather than assumed intact.
 */
export function issuanceVerdict({ decision = {}, stored = null, recomputed, manifest_check = null }: { decision?: any; stored?: any; recomputed: any; manifest_check?: any }) {
  if (!["issued", "executing", "effective", "in_force"].includes(decision.status)) {
    return { state: "not_issued", verified: false, reasons: [], assurance: ASSURANCE };
  }
  const reasons = [];
  if (!stored) reasons.push({ code: "no_snapshot", ar: "لا توجد حزمة إصدار محفوظة لهذا القرار.", en: "No stored issuance package exists for this decision." });
  if (!recomputed.ready) reasons.push(...recomputed.blockers);
  if (stored) {
    if (!manifest_check) {
      reasons.push({ code: "manifest_not_verified", ar: "لم تُتحقَّق بصمة حزمة الإصدار المحفوظة.", en: "The stored issuance package digest was not verified." });
    } else if (!manifest_check.verified) {
      reasons.push({
        code: manifest_check.code || "manifest_unverified",
        ar: "محتوى حزمة الإصدار المحفوظة لا يطابق بصمتها — الحزمة غير موثوقة ولا تُعدّ دليلًا.",
        en: "The stored issuance package's content does not match its own digest — it is not trustworthy evidence.",
        computed: manifest_check.computed || null,
        declared: manifest_check.declared || null,
      });
    }
  }
  return {
    state: stored && reasons.length === 0 ? "verified" : (stored ? "inconsistent" : "unverified"),
    verified: !!(stored && reasons.length === 0),
    reasons,
    assurance: ASSURANCE,
    manifest_verification: manifest_check,
    completeness: recomputed.completeness,
    message_ar: reasons.length ? ISSUANCE_COPY.unverified_ar : null,
    message_en: reasons.length ? ISSUANCE_COPY.unverified_en : null,
  };
}