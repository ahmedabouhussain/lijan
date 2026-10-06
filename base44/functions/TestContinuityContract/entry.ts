import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  STRUCTURE_VERSION,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_KEYS,
  AUTHORITY_EDGE_TYPES,
  NON_AUTHORITY_EDGE_TYPES,
  INTER_COMMITTEE_NON_DELEGABLE,
  assertRelationshipShape,
  detectAuthorityCycle,
  validateInterCommitteeDelegation,
  assertNoReDelegation,
  conveysApproval,
} from '../../shared/committeeStructure.ts';
import {
  CONTINUITY_VERSION,
  APPOINTMENT_EVENTS,
  IDENTITY_BOUND_ACTIONS,
  ACTING_RULES,
  NO_AUTO_SUCCESSION,
  EFFECTIVE_TIME_POLICY,
  HANDOVER_DISPOSITIONS,
  HANDOVER_EXCLUDED,
  evaluateAppointmentEvent,
  assessHandoverAcceptance,
  assessDisposition,
  proposeDisposition,
} from '../../shared/continuityContract.ts';

// TestContinuityContract — the structure and continuity contracts, exercised as policy.
//
// Scope, stated so the result is not over-read: this suite asserts the CONTRACT the commands and the
// command guard consume. It performs NO writes and reads NO records. It does not exercise a handler, a
// persisted appointment, a real handover or a browser path — those remain NOT TESTED until a seated,
// authenticated test actor exists.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const results = [];
    const check = (id, label, ok, detail) => results.push({ id, label, pass: !!ok, detail: detail || null });

    // ── Structure: what a relationship means ──────────────────────────────────────────────────────
    check('ST-001', 'the structure contract declares its version', STRUCTURE_VERSION === 'committee-structure-1.0.0', STRUCTURE_VERSION);
    check('ST-002', 'every relationship type states what it conveys',
      RELATIONSHIP_TYPE_KEYS.every((k) => RELATIONSHIP_TYPES[k].authority_flow !== undefined && RELATIONSHIP_TYPES[k].produces));
    check('ST-003', 'a REPORTING RECIPIENT never conveys approval', conveysApproval('reporting_recipient') === false);
    check('ST-004', 'an OVERSIGHT BODY never conveys approval', conveysApproval('oversight_body') === false);
    check('ST-005', 'a RATIFYING BODY does convey approval', conveysApproval('ratifying_body') === true);
    check('ST-006', 'an advisory group produces recommendations, not decisions',
      RELATIONSHIP_TYPES.advisory_group.produces === 'recommendation' && conveysApproval('advisory_group') === false);
    check('ST-007', 'an appointing body appoints without holding approval power',
      RELATIONSHIP_TYPES.appointing_body.conveys_appointment === true && conveysApproval('appointing_body') === false);
    check('ST-008', 'reporting and oversight are excluded from the authority-edge set',
      ['reporting_recipient', 'oversight_body', 'execution_dependency'].every((k) => !AUTHORITY_EDGE_TYPES.includes(k) && NON_AUTHORITY_EDGE_TYPES.includes(k)));
    check('ST-009', 'a committee cannot hold a relationship with itself',
      assertRelationshipShape({ subject_committee_id: 'A', counterparty_committee_id: 'A', relationship_type: 'subcommittee', legal_basis: 'x' })?.code === 'self_relationship');
    check('ST-010', 'a relationship without its legal basis is refused',
      assertRelationshipShape({ subject_committee_id: 'A', counterparty_committee_id: 'B', relationship_type: 'subcommittee' })?.code === 'missing_basis');
    check('ST-011', 'a relationship to a non-existent counterparty is refused',
      assertRelationshipShape({ subject_committee_id: 'A', counterparty_committee_id: 'B', relationship_type: 'subcommittee', legal_basis: 'x', counterparty_exists: false })?.code === 'missing_counterparty');
    check('ST-012', 'an unknown relationship type is refused',
      assertRelationshipShape({ subject_committee_id: 'A', counterparty_committee_id: 'B', relationship_type: 'best_friend', legal_basis: 'x' })?.code === 'unknown_relationship_type');

    // ── Structure: no authority loops ─────────────────────────────────────────────────────────────
    const direct = detectAuthorityCycle([], { committee_id: 'A', counterparty_committee_id: 'B', relationship_type: 'parent_committee', direction: 'outbound' });
    check('ST-013', 'a first parent link is accepted', direct === null);
    const closure = detectAuthorityCycle(
      [{ committee_id: 'A', counterparty_committee_id: 'B', relationship_type: 'parent_committee', direction: 'outbound' }],
      { committee_id: 'B', counterparty_committee_id: 'A', relationship_type: 'parent_committee', direction: 'outbound' },
    );
    check('ST-014', 'a body cannot be its own parent through a chain', closure?.code === 'authority_cycle', closure?.code);
    const deep = detectAuthorityCycle(
      [
        { committee_id: 'A', counterparty_committee_id: 'B', relationship_type: 'parent_committee', direction: 'outbound' },
        { committee_id: 'B', counterparty_committee_id: 'C', relationship_type: 'parent_committee', direction: 'outbound' },
      ],
      { committee_id: 'C', counterparty_committee_id: 'A', relationship_type: 'parent_committee', direction: 'outbound' },
    );
    check('ST-015', 'a three-link authority cycle is refused', deep?.code === 'authority_cycle');
    const reportingLoop = detectAuthorityCycle(
      [{ committee_id: 'A', counterparty_committee_id: 'B', relationship_type: 'reporting_recipient', direction: 'outbound' }],
      { committee_id: 'B', counterparty_committee_id: 'A', relationship_type: 'reporting_recipient', direction: 'outbound' },
    );
    check('ST-016', 'a permitted REPORTING network may loop — it carries no authority', reportingLoop === null);
    const ratifyLoop = detectAuthorityCycle(
      [{ committee_id: 'A', counterparty_committee_id: 'B', relationship_type: 'ratifying_body', direction: 'outbound' }],
      { committee_id: 'B', counterparty_committee_id: 'A', relationship_type: 'ratifying_body', direction: 'outbound' },
    );
    check('ST-017', 'a RATIFICATION loop is refused (approval is authority)', ratifyLoop?.code === 'authority_cycle');

    // ── Structure: bounded inter-committee delegation ─────────────────────────────────────────────
    const noReservation = validateInterCommitteeDelegation({ delegated_capabilities: ['agenda.edit'], reserved_matters: null, expires_at: '2027-01-01', delegatorCapabilities: ['agenda.edit'], relation_type: 'subcommittee' });
    check('ST-018', 'a delegation must state what the parent reserves', noReservation?.code === 'delegation_needs_reservation');
    const noExpiry = validateInterCommitteeDelegation({ delegated_capabilities: ['agenda.edit'], reserved_matters: 'ratification', expires_at: null, delegatorCapabilities: ['agenda.edit'], relation_type: 'subcommittee' });
    check('ST-019', 'an inter-committee delegation must state a lawful expiry', noExpiry?.code === 'delegation_needs_expiry');
    const illegal = validateInterCommitteeDelegation({ delegated_capabilities: ['committee.manage'], reserved_matters: 'none', expires_at: '2027-01-01', delegatorCapabilities: ['committee.manage'], relation_type: 'subcommittee' });
    check('ST-020', 'a parent cannot delegate reconstituting or closing committees', illegal?.code === 'delegation_not_lawful' && INTER_COMMITTEE_NON_DELEGABLE.includes('committee.manage'));
    const beyond = validateInterCommitteeDelegation({ delegated_capabilities: ['vote.call'], reserved_matters: 'none', expires_at: '2027-01-01', delegatorCapabilities: ['agenda.edit'], relation_type: 'subcommittee' });
    check('ST-021', 'a parent cannot delegate a power it does not itself hold', beyond?.code === 'delegation_beyond_delegator');
    const lawful = validateInterCommitteeDelegation({ delegated_capabilities: ['agenda.edit'], reserved_matters: 'ratification of decisions', expires_at: '2027-01-01', delegatorCapabilities: ['agenda.edit', 'decision.approve', 'vote.call'], relation_type: 'subcommittee' });
    check('ST-022', 'a bounded, expiring, within-authority delegation is accepted', lawful === null);
    const reDelegated = assertNoReDelegation({ source_relationship: { delegated_capabilities: ['agenda.edit'] }, delegated_capabilities: ['agenda.edit'] });
    check('ST-023', 'a delegated power may not be re-delegated onward', reDelegated?.code === 're_delegation_refused');
    const newPower = assertNoReDelegation({ source_relationship: { delegated_capabilities: ['agenda.edit'] }, delegated_capabilities: ['attendance.respond'] });
    check('ST-024', 'a child may delegate only what it holds in its own right', newPower === null);

    // ── Continuity: appointment events ────────────────────────────────────────────────────────────
    const seat = { id: 'SEAT-1', committee_id: 'COM-1', user_id: 'USR-1', role: 'chair', status: 'active' };
    const resignation = evaluateAppointmentEvent({ event_type: 'resignation', seat, actor_user_id: 'USR-1', reason_class: 'personal_private', evidence_url: 'https://example.org/notice', today: '2026-10-06T00:00:00Z' });
    check('ST-025', 'a resignation is a personal act, ends the seat and leaves a vacancy', resignation.ok && resignation.seats_ended && resignation.creates_vacancy);
    check('ST-026', 'a private reason is never surfaced through registers', resignation.reason_visible_in_registers === false);
    const otherResign = evaluateAppointmentEvent({ event_type: 'resignation', seat, actor_user_id: 'USR-2' });
    check('ST-027', 'nobody resigns another person\u2019s seat', otherResign?.code === 'identity_mismatch', otherResign?.code);
    const removalBySelf = evaluateAppointmentEvent({ event_type: 'removal', seat, actor_user_id: 'USR-1', reason_class: 'institutional', evidence_url: 'https://example.org/x' });
    check('ST-028', 'a removal requires a competent authority, never the seat holder', removalBySelf?.code === 'authority_required');
    const removal = evaluateAppointmentEvent({ event_type: 'removal', seat, actor_user_id: 'USR-9', actor_is_competent_authority: true, reason_class: 'institutional', evidence_url: 'https://example.org/x' });
    check('ST-029', 'a removal by a competent authority ends the seat and leaves the obligations with the institution',
      removal.ok && removal.obligations_remain_with === 'institution');
    const endedSeat = evaluateAppointmentEvent({ event_type: 'end_of_term', seat: { ...seat, status: 'resigned' }, actor_user_id: 'USR-9', actor_is_competent_authority: true });
    check('ST-030', 'an already ended seat is not ended twice', endedSeat?.code === 'seat_not_active');
    const privateEvent = evaluateAppointmentEvent({ event_type: 'end_of_term', seat, actor_user_id: 'USR-9', actor_is_competent_authority: true, reason_class: 'personal_private' });
    check('ST-031', 'a reason class the event does not permit is refused', privateEvent?.code === 'reason_class_not_permitted');
    const noEvidence = evaluateAppointmentEvent({ event_type: 'resignation', seat, actor_user_id: 'USR-1', reason_class: 'institutional' });
    check('ST-032', 'an event that requires evidence is refused without it', noEvidence?.code === 'evidence_required');
    check('ST-033', 'no office succeeds another automatically', NO_AUTO_SUCCESSION.vice_chair_inherits_chair === false && NO_AUTO_SUCCESSION.new_assignment_required === true);
    check('ST-034', 'the predecessor\u2019s account and grants are never reused',
      NO_AUTO_SUCCESSION.predecessor_account_reused === false && NO_AUTO_SUCCESSION.predecessor_grants_reused === false);

    // ── Continuity: bounded acting capacity ───────────────────────────────────────────────────────
    const unbounded = evaluateAppointmentEvent({ event_type: 'acting_appointment', seat, actor_user_id: 'USR-9', actor_is_competent_authority: true, reason_class: 'institutional', evidence_url: 'https://example.org/x', acting_scope: [], acting_expires_at: '2026-12-01T00:00:00Z', today: '2026-10-06T00:00:00Z' });
    check('ST-035', 'an acting appointment must state the powers it carries', unbounded?.code === 'acting_scope_required');
    const openEnded = evaluateAppointmentEvent({ event_type: 'acting_appointment', seat, actor_user_id: 'USR-9', actor_is_competent_authority: true, reason_class: 'institutional', evidence_url: 'https://example.org/x', acting_scope: ['vote.call'], today: '2026-10-06T00:00:00Z' });
    check('ST-036', 'an acting appointment must state when it ends', openEnded?.code === 'acting_expiry_required');
    const overLong = evaluateAppointmentEvent({ event_type: 'acting_appointment', seat, actor_user_id: 'USR-9', actor_is_competent_authority: true, reason_class: 'institutional', evidence_url: 'https://example.org/x', acting_scope: ['vote.call'], acting_expires_at: '2028-01-01T00:00:00Z', today: '2026-10-06T00:00:00Z' });
    check('ST-037', 'an acting period beyond the lawful maximum is refused', overLong?.code === 'acting_too_long', `${overLong?.days} days`);
    const actingAdmin = evaluateAppointmentEvent({ event_type: 'acting_appointment', seat, actor_user_id: 'USR-9', actor_is_competent_authority: true, reason_class: 'institutional', evidence_url: 'https://example.org/x', acting_scope: ['committee.manage'], acting_expires_at: '2026-12-01T00:00:00Z', today: '2026-10-06T00:00:00Z' });
    check('ST-038', 'an acting appointment cannot carry reconstituting or closing committees', actingAdmin?.code === 'acting_scope_illegal');
    const lawfulActing = evaluateAppointmentEvent({ event_type: 'acting_appointment', seat, actor_user_id: 'USR-9', actor_is_competent_authority: true, reason_class: 'institutional', evidence_url: 'https://example.org/x', acting_scope: ['vote.call', 'decision.issue'], acting_expires_at: '2026-12-01T00:00:00Z', today: '2026-10-06T00:00:00Z' });
    check('ST-039', 'a bounded acting appointment with a stated expiry is accepted', lawfulActing.ok && lawfulActing.bounded === true);
    check('ST-040', 'a bounded appointment never becomes permanent by remaining in force',
      ACTING_RULES.becomes_permanent_by_remaining === false && ACTING_RULES.inherits_all_office_powers === false);

    // ── Continuity: effective time, history and the handover ─────────────────────────────────────
    check('ST-041', 'effective date is distinguished from recorded date and backdating is prohibited',
      EFFECTIVE_TIME_POLICY.effective_date_is_not_recorded_date && EFFECTIVE_TIME_POLICY.retroactive_signature_permitted === false && EFFECTIVE_TIME_POLICY.backdated_attendance_permitted === false);
    check('ST-042', 'a valid cast vote is never reassigned to a successor',
      EFFECTIVE_TIME_POLICY.cast_vote_is_immutable && EFFECTIVE_TIME_POLICY.cast_vote_reassigned_to_successor === false);
    check('ST-043', 'a membership change does not invalidate valid past decisions',
      EFFECTIVE_TIME_POLICY.membership_change_invalidates_past_decisions === false);
    check('ST-044', 'a supersession requires a stated reason', EFFECTIVE_TIME_POLICY.supersession_requires_reason === true);
    check('ST-045', 'both personal acts are bound to the actor\u2019s own identity',
      IDENTITY_BOUND_ACTIONS['seat.resign'] === 'user_id' && IDENTITY_BOUND_ACTIONS['seat.handover_accept'] === 'successor_user_id');
    const notSuccessor = assessHandoverAcceptance({ pack: { id: 'H1', status: 'pending_acceptance', successor_user_id: 'USR-1' }, actor_user_id: 'USR-2' });
    check('ST-046', 'only the named successor accepts the handover', notSuccessor?.code === 'handover_not_successor');
    const successorOk = assessHandoverAcceptance({ pack: { id: 'H1', status: 'pending_acceptance', successor_user_id: 'USR-1', effective_date: '2026-10-01' }, actor_user_id: 'USR-1', today: '2026-10-06T00:00:00Z' });
    check('ST-047', 'the successor accepts their own handover', successorOk.ok === true);
    const notYet = assessHandoverAcceptance({ pack: { id: 'H1', status: 'pending_acceptance', successor_user_id: 'USR-1', effective_date: '2026-12-01' }, actor_user_id: 'USR-1', today: '2026-10-06T00:00:00Z' });
    check('ST-048', 'a handover is not accepted before its effective date', notYet?.code === 'handover_not_effective_yet');
    const noReason = assessHandoverAcceptance({ pack: { id: 'H1', status: 'pending_acceptance', successor_user_id: 'USR-1' }, actor_user_id: 'USR-1', decision: 'return', return_reason: '   ' });
    check('ST-049', 'a returned handover states what is missing', noReason?.code === 'handover_return_reason_required');
    const closed = assessHandoverAcceptance({ pack: { id: 'H1', status: 'accepted', successor_user_id: 'USR-1' }, actor_user_id: 'USR-1' });
    check('ST-050', 'a decided handover is not reopened', closed?.code === 'handover_not_open');
    check('ST-051', 'a personal delegation is revoked, never transferred', proposeDisposition('personal_delegation') === 'revoke_not_transferred');
    check('ST-052', 'revoking a personal item does not transfer responsibility',
      HANDOVER_DISPOSITIONS.revoke_not_transferred.moves_future_responsibility === false && HANDOVER_DISPOSITIONS.revoke_not_transferred.personal === true);
    check('ST-053', 'assigning an obligation to a successor requires that successor',
      assessDisposition('assign_to_successor', { has_successor: false })?.code === 'disposition_needs_successor');
    check('ST-054', 'an unknown disposition is refused', assessDisposition('give_it_away', { has_successor: true })?.code === 'disposition_unknown');
    check('ST-055', 'every inventory obligation type has a proposed disposition',
      ['open_action', 'agenda_item', 'pending_signature', 'upcoming_meeting', 'group_membership', 'document_custody', 'official_correspondence', 'review_request', 'personal_delegation', 'active_delegation', 'risk', 'unresolved_exception']
        .every((t) => !!HANDOVER_DISPOSITIONS[proposeDisposition(t)]));
    check('ST-056', 'private notes, personal delegations, credentials, messages and unrelated memberships are excluded from automatic handover',
      ['private_notes', 'personal_delegations', 'personal_credentials', 'personal_messages', 'unrelated_memberships', 'own_consents']
        .every((k) => HANDOVER_EXCLUDED.some((x) => x.key === k)));
    check('ST-057', 'committee-level obligations are not moved by rewriting their source record',
      HANDOVER_DISPOSITIONS.return_to_institution.moves_future_responsibility === false);
    check('ST-058', 'ending a seat declares a handover requirement', APPOINTMENT_EVENTS.resignation.seats_ended === true && APPOINTMENT_EVENTS.appointment.creates_assignment === true);
    check('ST-059', 'the continuity contract declares its version', CONTINUITY_VERSION === 'continuity-1.0.0', CONTINUITY_VERSION);
    check('ST-060', 'every appointment event declares its reason classes and obligations holder',
      Object.keys(APPOINTMENT_EVENTS).every((k) => Array.isArray(APPOINTMENT_EVENTS[k].reason_classes) && !!APPOINTMENT_EVENTS[k].obligations_remain_with));

    const failed = results.filter((r) => !r.pass);
    return Response.json({
      status: failed.length === 0 ? 'PASS' : 'FAIL',
      suites: {
        structure_contract: { version: STRUCTURE_VERSION, cases: results.filter((r) => r.id.startsWith('ST-0') && Number(r.id.slice(3)) <= 24).length },
        continuity_contract: { version: CONTINUITY_VERSION, cases: results.filter((r) => Number(r.id.slice(3)) > 24).length },
      },
      totals: { cases: results.length, passed: results.length - failed.length, failed: failed.length },
      failures: failed.map((f) => ({ id: f.id, label: f.label, detail: f.detail })),
      writes_performed: 0,
      records_read: 0,
      coverage: {
        contract_policy: 'TESTED',
        command_handlers: 'NOT TESTED (no authenticated seated actor)',
        persisted_appointment_handover: 'NOT TESTED',
        browser_acceptance: 'NOT TESTED',
      },
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}