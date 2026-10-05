import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  evaluateIssuanceReadiness, issuanceVerdict, verifyStoredManifest, presentSeats, canonicalManifest, manifestDigest,
  INTEGRITY_POLICY_VERSION, ISSUANCE_REQUIREMENTS,
} from '../../shared/decisionIntegrity.ts';
import { loadRoundContext } from '../../shared/roundContext.ts';

// TestDecisionIntegrity — the EXECUTED evidence for the issuance invariant raised by P0-01.
//
// Pure: no entity is created, updated or deleted, so running it changes nothing. It states, case by
// case, whether the ONE evaluator refuses the contradictory package the brief identified and accepts
// a coherent one. A PASS here is only a statement about this module — the browser and concurrency
// rows of the acceptance catalogue remain NOT TESTED / NOT ESTABLISHED and are labelled so.
//
// The FIRST fixture is the real shape of the reported defect: a decision presenting as issued with
// 0 eligible seats against 13 recorded ballots, 5 of 6 mandatory items, no proof links and no date.

const D = (over: any = {}) => ({
  id: 'DEC-FIXTURE', committee_id: 'C-FIXTURE', meeting_id: 'M-FIXTURE', decision_number: '2026/09',
  title: 'National charter', proposal: 'Proposal text', legal_basis: 'Establishing decision',
  vote_for: 13, vote_against: 0, vote_abstain: 0, status: 'approved', ...over,
});
const C = (over: any = {}) => ({ id: 'C-FIXTURE', quorum_count: 3, voting_rule: 'simple_majority', mandate: 'Mandate text', ...over });
const seat = (n: number) => ({ id: `SEAT-${n}`, status: 'active', user_id: `USER-${n}`, voting_right: true, role: 'member' });
const ballot = (n: number, choice = 'for') => ({ id: `V-${n}-${choice}`, voter_membership_id: `SEAT-${n}`, voter_user_id: `USER-${n}`, vote_choice: choice });
// Attendance rows carry the SEAT (member_id). The earlier fixture omitted it — a present row with no
// seat identity, which the 1.1.0 quorum rule correctly IGNORES. That was a defect in the FIXTURE, not
// in the evaluator (the same class as DI-012/DI-016 earlier): a row that cannot be attributed to a
// seat is not evidence that a seat was present.
const attendanceFor = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `A-${i}`, member_id: `SEAT-${i + 1}`, attendance_status: 'present' }));

function codes(result: any) { return (result.blockers || []).map((b: any) => b.code); }

export default async function (req) {
  try {
    const results: any[] = [];
    const check = (id: string, description: string, ok: boolean, detail: any) =>
      results.push({ test_id: id, description, verdict: ok ? 'PASS' : 'FAIL', detail });

    // ── F-A: the reported defect exactly as observed ────────────────────────────────────────────
    const defect = evaluateIssuanceReadiness({
      decision: D(),
      committee: C(),
      memberships: [],
      recusals: [],
      votes: Array.from({ length: 13 }, (_, i) => ({ id: `V-RAW-${i}`, vote_choice: 'for' })),
      attendance: [],
      signatures: [],
      proof_links: [],
      now: '2026-10-05T12:00:00.000Z',
    });
    check('DI-001', 'A 0-seat electorate with 13 recorded ballots is refused', defect.ready === false && codes(defect).includes('no_electorate'), { ready: defect.ready, codes: codes(defect), electorate: defect.electorate.size, accepted: defect.ballots.accepted_count });
    check('DI-002', 'Ballots with no seat and no person are not counted at all', defect.ballots.accepted_count === 0 && codes(defect).includes('malformed_ballot'), { accepted: defect.ballots.accepted_count, malformed: defect.ballots.malformed.length });
    check('DI-003', 'The recorded result no longer reconciles once nothing is countable', codes(defect).includes('tally_mismatch'), { declared: `${D().vote_for}/${D().vote_against}/${D().vote_abstain}`, counted: `${defect.ballots.tally.for}/${defect.ballots.tally.against}/${defect.ballots.tally.abstain}` });
    check('DI-004', 'Missing proof links are a blocker, not an empty success', codes(defect).includes('incomplete_proof_links'), { missing: defect.completeness.missing });
    check('DI-005', 'An unproven signature requirement is reported as missing evidence', codes(defect).includes('incomplete_signatures_per_policy') && defect.signatures.requirement === 'required', { requirement: defect.signatures.requirement, present: defect.signatures.present_count, basis: defect.signatures.basis });
    check('DI-006', 'Completeness is reported as the real ratio, not as satisfied', defect.completeness.required === ISSUANCE_REQUIREMENTS.length && defect.completeness.satisfied < defect.completeness.required, defect.completeness);

    // ── F-B: an issued record over contradictory evidence is not "verified" ─────────────────────
    const verdict = issuanceVerdict({ decision: D({ status: 'issued', issued_at: null }), stored: null, recomputed: defect });
    check('DI-007', 'A record presenting as issued without a package is unverified, never verified', verdict.verified === false && verdict.state === 'unverified', { state: verdict.state, reasons: verdict.reasons.length });
    const verdictDated = issuanceVerdict({ decision: D({ status: 'issued', issued_at: '2026-09-30T00:00:00.000Z' }), stored: null, recomputed: defect });
    check('DI-008', 'A stated issue date does not by itself make a contradictory package verified', verdictDated.verified === false, { state: verdictDated.state });

    // ── F-C: duplicate, excess and ineligible ballots ───────────────────────────────────────────
    const dup = evaluateIssuanceReadiness({
      decision: D({ vote_for: 2, vote_against: 0, vote_abstain: 0 }), committee: C(),
      memberships: [seat(1), seat(2)], votes: [ballot(1), ballot(1), ballot(2)], attendance: attendanceFor(3), signatures: [{ id: 'S1', signer_name: 'X', status: 'active' }], proof_links: ['e'],
    });
    check('DI-009', 'A seat voting twice is refused', codes(dup).includes('duplicate_seat_ballot'), { duplicates: dup.ballots.duplicates.length, accepted: dup.ballots.accepted_count });
    const excess = evaluateIssuanceReadiness({
      decision: D({ vote_for: 3, vote_against: 0, vote_abstain: 0 }), committee: C(),
      memberships: [seat(1), seat(2)], votes: [ballot(1), ballot(2), { id: 'V-3', voter_membership_id: 'SEAT-9', voter_user_id: 'USER-9', vote_choice: 'for' }], attendance: attendanceFor(3), signatures: [{ id: 'S1', status: 'active' }], proof_links: ['e'],
    });
    check('DI-010', 'A ballot from outside the electorate is refused', codes(excess).includes('ineligible_ballot'), { rejected: excess.ballots.ineligible.length, accepted: excess.ballots.accepted_count });

    // ── F-D: quorum and threshold follow the committee rule, not a hardcoded majority ───────────
    const noQuorum = evaluateIssuanceReadiness({
      decision: D({ vote_for: 3, vote_against: 0, vote_abstain: 0 }), committee: C({ quorum_count: 5 }),
      memberships: [seat(1), seat(2), seat(3)], votes: [ballot(1), ballot(2), ballot(3)], attendance: attendanceFor(2), signatures: [{ id: 'S1', status: 'active' }], proof_links: ['e'],
    });
    check('DI-011', 'Attendance below the committee quorum is refused', codes(noQuorum).includes('quorum_not_met'), noQuorum.quorum);
    // The fixture is chosen so the two rules DISAGREE: 3 for of 5 cast clears a simple majority
    // (needs 3) and fails two-thirds (needs 4). An earlier version of this case used 2 for of 3,
    // which satisfies two-thirds exactly — the assertion was wrong there, not the evaluator, and
    // the corrected case is the one that actually discriminates between the two rules.
    const twoThirds = evaluateIssuanceReadiness({
      decision: D({ vote_for: 3, vote_against: 2, vote_abstain: 0 }), committee: C({ quorum_count: 3, voting_rule: 'two_thirds' }),
      memberships: [seat(1), seat(2), seat(3), seat(4), seat(5)],
      votes: [ballot(1), ballot(2), ballot(3), ballot(4, 'against'), ballot(5, 'against')],
      attendance: attendanceFor(4), signatures: [{ id: 'S1', status: 'active' }], proof_links: ['e'],
    });
    check('DI-012', 'A two-thirds rule fails where a simple majority would pass, and the basis says why', codes(twoThirds).includes('threshold_not_met') && twoThirds.threshold.needed === 4 && twoThirds.threshold.basis.includes('two-thirds'), twoThirds.threshold);

    // ── F-E: a coherent package is issued-worthy ─────────────────────────────────────────────────
    const coherent = evaluateIssuanceReadiness({
      decision: D({ vote_for: 4, vote_against: 1, vote_abstain: 0 }), committee: C({ quorum_count: 3, required_signatures: 1 }),
      memberships: [seat(1), seat(2), seat(3), seat(4), seat(5)],
      recusals: [],
      votes: [ballot(1), ballot(2), ballot(3), ballot(4), ballot(5, 'against')],
      attendance: attendanceFor(4),
      signatures: [{ id: 'S1', signer_name: 'Chair', status: 'active' }],
      proof_links: ['https://example.invalid/evidence/1'],
      now: '2026-10-05T12:00:00.000Z',
    });
    check('DI-013', 'A coherent, complete package is ready for issuance', coherent.ready === true, { ready: coherent.ready, blockers: codes(coherent), electorate: coherent.electorate.size, accepted: coherent.ballots.accepted_count, completeness: coherent.completeness });

    // ── F-F: an explicit "none required" policy is a different fact from missing evidence ───────
    const notRequired = evaluateIssuanceReadiness({
      decision: D({ vote_for: 1, vote_against: 0, vote_abstain: 0 }),
      committee: C({ signature_requirement: 'not_required' }),
      memberships: [seat(1)], votes: [ballot(1)], attendance: attendanceFor(1), signatures: [], proof_links: ['e'],
    });
    check('DI-014', 'An explicit not-required policy satisfies the signature requirement', notRequired.signatures.requirement === 'not_required' && notRequired.signatures.satisfied === true && notRequired.signatures.declared === true, notRequired.signatures);
    check('DI-015', 'With no such policy, no signatures still means evidence is missing', coherent.signatures.declared === false);
    const recused = evaluateIssuanceReadiness({
      decision: D({ vote_for: 1, vote_against: 0, vote_abstain: 0 }), committee: C(),
      memberships: [seat(1), seat(2)],
      recusals: [{ id: 'R1', status: 'active', membership_id: 'SEAT-2' }],
      votes: [ballot(1)], attendance: attendanceFor(2), signatures: [{ id: 'S1', status: 'active' }], proof_links: ['e'],
    });
    check('DI-016', 'A recused seat leaves the eligible electorate', recused.electorate.size === 1 && recused.electorate.excluded.some((e: any) => e.reason === 'recused'), { size: recused.electorate.size, excluded: recused.electorate.excluded });

    // ── F-G: the manifest digest is deterministic and content-sensitive ──────────────────────────
    const c1 = canonicalManifest(coherent.manifest_input);
    const c2 = canonicalManifest({ ...coherent.manifest_input });
    const c3 = canonicalManifest({ ...coherent.manifest_input, decision_number: '2026/10' });
    const [h1, h2, h3] = await Promise.all([manifestDigest(c1), manifestDigest(c2), manifestDigest(c3)]);
    check('DI-017', 'The same package always produces the same digest', h1 === h2 && h1.startsWith('sha256:') && h1.length === 71, { digest: h1.slice(0, 20) + '…' });
    check('DI-018', 'A changed package produces a different digest', h1 !== h3);

    // ── F-H: the electorate of a round is the FROZEN one, not whoever holds a seat today ──────────
    const frozenSeats = [seat(1), seat(2), seat(3)];
    const roundWithLateSeat = evaluateIssuanceReadiness({
      decision: D({ vote_for: 2, vote_against: 0, vote_abstain: 0 }),
      committee: C({ quorum_count: 3 }),
      memberships: frozenSeats,
      recusals: [],
      votes: [ballot(1), ballot(2), { id: 'V-LATE', voter_membership_id: 'SEAT-9', voter_user_id: 'USER-9', vote_choice: 'for' }],
      attendance: attendanceFor(3),
      signatures: [{ id: 'S1', status: 'active' }],
      proof_links: ['e'],
    });
    check('DI-019', 'A ballot from a seat appointed AFTER the round froze is not counted in that round', codes(roundWithLateSeat).includes('ineligible_ballot') && roundWithLateSeat.ballots.accepted_count === 2 && roundWithLateSeat.ballots.ineligible.length === 1, { accepted: roundWithLateSeat.ballots.accepted_count, ineligible: roundWithLateSeat.ballots.ineligible.length, codes: codes(roundWithLateSeat) });
    const roundExact = evaluateIssuanceReadiness({
      decision: D({ vote_for: 2, vote_against: 0, vote_abstain: 0 }),
      committee: C({ quorum_count: 3 }),
      memberships: frozenSeats,
      recusals: [],
      votes: [ballot(1), ballot(2)],
      attendance: attendanceFor(3),
      signatures: [{ id: 'S1', status: 'active' }],
      proof_links: ['e'],
    });
    check('DI-020', 'The same round reconciles and becomes issuable when every ballot belongs to a frozen seat', roundExact.ready === true && roundExact.ballots.accepted_count === 2, { ready: roundExact.ready, accepted: roundExact.ballots.accepted_count, blockers: codes(roundExact) });

    // ── F-I: the stored manifest is VERIFIED against its own digest (it was a no-op before) ───────
    const canonical = canonicalManifest(coherent.manifest_input);
    const digest = await manifestDigest(canonical);
    const intact = await verifyStoredManifest({ evidence_manifest: canonical, manifest_sha256: digest });
    check('DI-021', 'An intact stored package verifies by RE-HASHING its content', intact.verified === true && intact.computed === digest, { code: intact.code });
    // The content is altered while the stored digest is left exactly as issued: the shape a tampered
    // package actually takes.
    const tamperedContent = canonical.replace('"2026/09"', '"2026/10"');
    const contentAltered = await verifyStoredManifest({ evidence_manifest: tamperedContent, manifest_sha256: digest });
    check('DI-022', 'ALTERED CONTENT is detected although the stored digest is untouched', tamperedContent !== canonical && contentAltered.verified === false && contentAltered.code === 'manifest_digest_mismatch', { computed: String(contentAltered.computed).slice(0, 22) + '…', declared: String(digest).slice(0, 22) + '…' });
    const digestAltered = await verifyStoredManifest({ evidence_manifest: canonical, manifest_sha256: 'sha256:' + '0'.repeat(64) });
    check('DI-023', 'An ALTERED DIGEST is detected against unchanged content', digestAltered.verified === false && digestAltered.code === 'manifest_digest_mismatch');
    const noManifest = await verifyStoredManifest({ manifest_sha256: digest });
    check('DI-024', 'A snapshot with no manifest is not verified', noManifest.verified === false && noManifest.code === 'manifest_missing');
    const tamperVerdict = issuanceVerdict({ decision: D({ status: 'issued', issued_at: '2026-10-05T00:00:00.000Z' }), stored: { id: 'SNP-1', evidence_manifest: tamperedContent, manifest_sha256: digest }, recomputed: coherent, manifest_check: contentAltered });
    check('DI-025', 'A tampered package reads as inconsistent, never verified', tamperVerdict.verified === false && tamperVerdict.state === 'inconsistent' && tamperVerdict.reasons.some((r: any) => r.code === 'manifest_digest_mismatch'), { state: tamperVerdict.state });
    const unverifiedVerdict = issuanceVerdict({ decision: D({ status: 'issued', issued_at: '2026-10-05T00:00:00.000Z' }), stored: { id: 'SNP-1', evidence_manifest: canonical, manifest_sha256: digest }, recomputed: coherent, manifest_check: null });
    check('DI-026', 'A package whose digest was NOT checked is reported unverified, never assumed intact', unverifiedVerdict.verified === false && unverifiedVerdict.reasons.some((r: any) => r.code === 'manifest_not_verified'));
    const cleanVerdict = issuanceVerdict({ decision: D({ status: 'issued', issued_at: '2026-10-05T00:00:00.000Z' }), stored: { id: 'SNP-1', evidence_manifest: canonical, manifest_sha256: digest }, recomputed: coherent, manifest_check: intact });
    check('DI-027', 'An intact AND reconciling package reads as verified', cleanVerdict.verified === true && cleanVerdict.state === 'verified', { state: cleanVerdict.state });

    // ── F-J: quorum is counted over DISTINCT ELIGIBLE VOTING SEATS, not rows ─────────────────────
    const dupAndObserver = evaluateIssuanceReadiness({
      decision: D({ vote_for: 2, vote_against: 0, vote_abstain: 0 }), committee: C({ quorum_count: 2 }),
      memberships: [seat(1), seat(2)],
      votes: [ballot(1), ballot(2)],
      attendance: [
        { id: 'A-1', member_id: 'SEAT-1', attendance_status: 'present' },
        { id: 'A-1-DUP', member_id: 'SEAT-1', attendance_status: 'present' },
        { id: 'A-2', member_id: 'SEAT-2', attendance_status: 'present' },
        { id: 'A-OBS', member_id: 'SEAT-OBS', attendance_status: 'present' },
      ],
      signatures: [{ id: 'S1', status: 'active' }], proof_links: ['e'],
    });
    check('DI-028', 'A duplicate row for one seat and a present non-voting seat do NOT count toward quorum', dupAndObserver.quorum.present === 2 && dupAndObserver.quorum.met === true && dupAndObserver.quorum.ignored_rows.length === 2, dupAndObserver.quorum);
    const observerQuorum = evaluateIssuanceReadiness({
      decision: D({ vote_for: 1, vote_against: 0, vote_abstain: 0 }), committee: C({ quorum_count: 2 }),
      memberships: [seat(1)],
      votes: [ballot(1)],
      attendance: [{ id: 'A-OBS', member_id: 'SEAT-OBS', attendance_status: 'present' }, { id: 'A-1', member_id: 'SEAT-1', attendance_status: 'present' }],
      signatures: [{ id: 'S1', status: 'active' }], proof_links: ['e'],
    });
    check('DI-029', 'A present observer cannot make a quorum', observerQuorum.quorum.present === 1 && observerQuorum.quorum.met === false && codes(observerQuorum).includes('quorum_not_met'), observerQuorum.quorum);
    const principalAlternate = evaluateIssuanceReadiness({
      decision: D({ vote_for: 2, vote_against: 0, vote_abstain: 0 }), committee: C(),
      memberships: [
        { id: 'SEAT-P', status: 'active', user_id: 'USER-SAME', voting_right: true, role: 'member' },
        { id: 'SEAT-A', status: 'active', user_id: 'USER-SAME', voting_right: true, role: 'member' },
      ],
      votes: [
        { id: 'V-P', voter_membership_id: 'SEAT-P', voter_user_id: 'USER-SAME', vote_choice: 'for' },
        { id: 'V-A', voter_membership_id: 'SEAT-A', voter_user_id: 'USER-SAME', vote_choice: 'for' },
      ],
      attendance: attendanceFor(2), signatures: [{ id: 'S1', status: 'active' }], proof_links: ['e'],
    });
    check('DI-030', 'One person holding a PRINCIPAL and an ALTERNATE seat is never counted twice', principalAlternate.ballots.accepted_count === 1 && codes(principalAlternate).includes('duplicate_seat_ballot'), { accepted: principalAlternate.ballots.accepted_count, duplicates: principalAlternate.ballots.duplicates });
    const seatRows = presentSeats({ attendance: [{ member_id: 'SEAT-1', attendance_status: 'late' }, { member_id: 'SEAT-1', attendance_status: 'present' }], seats: [{ seat_id: 'SEAT-1' }] });
    check('DI-031', 'presentSeats names the ignored rows instead of hiding them', seatRows.count === 1 && seatRows.ignored[0].reason === 'duplicate_row_for_one_seat', seatRows);

    // ── F-K: the ROUND decides whose seats and which ballots belong to it ─────────────────────────
    // A seat whose appointment has since ENDED, an election the register no longer lists as active,
    // and a ballot cast in an EARLIER round: none of them may be re-decided by reading today's rows.
    const roundStub = {
      entities: {
        EligibleVoterSnapshot: { filter: async () => [{ id: 'RND-2', round: 2, status: 'active', frozen_on: '2026-10-01', eligible_seat_ids: ['SEAT-1', 'SEAT-2'], eligible_count: 2, eligibility_policy_version: 'vote-eligibility-1.0.0', proposal_version: 'pv-2' }] },
        CommitteeMembership: { filter: async () => [
          { id: 'SEAT-1', user_id: 'USER-1', role: 'member', status: 'active' },
          { id: 'SEAT-2', user_id: 'USER-2', role: 'member', status: 'ended', term_end: '2026-09-30' },
        ] },
        Recusal: { filter: async () => [] },
        Vote: { filter: async () => [
          { id: 'V-R1', voter_membership_id: 'SEAT-1', voter_user_id: 'USER-1', vote_choice: 'for', eligible_voter_snapshot_id: 'RND-1' },
          { id: 'V-R2', voter_membership_id: 'SEAT-1', voter_user_id: 'USER-1', vote_choice: 'for', eligible_voter_snapshot_id: 'RND-2' },
        ] },
      },
    };
    const ctx = await loadRoundContext(roundStub, { decision_id: 'DEC-FIXTURE', committee_id: 'C-FIXTURE' });
    check('DI-032', 'Only ballots bound to the ACTIVE round are counted; an earlier round is REPORTED, not counted', ctx.ballots.length === 1 && ctx.ballots[0].id === 'V-R2' && ctx.out_of_round_votes.length === 1, { in_round: ctx.ballots.map((b: any) => b.id), out_of_round: ctx.out_of_round_votes.map((v: any) => v.id) });
    check('DI-033', 'A seat whose appointment has since ENDED is still the seat that was frozen (historical electorate preserved)', ctx.memberships.length === 2 && ctx.unresolved_seat_ids.length === 0 && ctx.as_of === '2026-10-01', { seats: ctx.memberships.map((m: any) => m.id), as_of: ctx.as_of });
    const unresolved = await loadRoundContext({
      entities: {
        EligibleVoterSnapshot: { filter: async () => [{ id: 'RND-3', round: 3, status: 'active', frozen_on: '2026-10-02', eligible_seat_ids: ['SEAT-1', 'SEAT-DELETED'], eligible_count: 2 }] },
        CommitteeMembership: { filter: async () => [{ id: 'SEAT-1', user_id: 'USER-1', status: 'active' }] },
        Recusal: { filter: async () => [] },
        Vote: { filter: async () => [] },
      },
    }, { decision_id: 'DEC-FIXTURE', committee_id: 'C-FIXTURE' });
    check('DI-034', 'A round naming a seat that no longer EXISTS is reported unresolved (a broken chain, not a pass)', unresolved.unresolved_seat_ids.length === 1 && unresolved.unresolved_seat_ids[0] === 'SEAT-DELETED', { unresolved: unresolved.unresolved_seat_ids });

    const failed = results.filter((r) => r.verdict === 'FAIL');
    return Response.json({
      integrity_policy_version: INTEGRITY_POLICY_VERSION,
      suites: { issuance_integrity: { total: results.length, passed: results.length - failed.length, failed: failed.length, verdict: failed.length === 0 ? 'PASS' : 'FAIL' } },
      fixtures: {
        'F-A': 'the reported defect: 0-seat electorate, 13 un-attributable ballots, 5 of 6 items, no proof links, no date',
        'F-B': 'issued record without a stored package', 'F-C': 'duplicate / excess / ineligible ballots',
        'F-D': 'quorum and rule-specific threshold', 'F-E': 'coherent complete package',
        'F-F': 'explicit not-required signature policy vs missing evidence', 'F-G': 'manifest digest determinism',
        'F-I': 'stored-manifest verification: intact / altered content / altered digest / missing manifest',
        'F-J': 'quorum over distinct eligible voting seats; principal + alternate',
        'F-K': 'the round decides the seats and the ballots: ended seat preserved, other-round ballot reported',
      },
      writes_performed: 0,
      results,
      evidence_ids: results.map((r) => `E-A07-${r.test_id}`),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}