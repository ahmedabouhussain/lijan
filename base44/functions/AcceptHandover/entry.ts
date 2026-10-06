import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse, requestClaims } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';
import {
  CONTINUITY_VERSION,
  HANDOVER_DISPOSITIONS,
  assessHandoverAcceptance,
  assessDisposition,
  refusal,
} from '../../shared/continuityContract.ts';

// AcceptHandover — the NAMED successor accepts institutional obligations under their OWN identity.
//
// What moves: future responsibility for open obligations, and the personal authority (delegations) that
// must be REVOKED rather than inherited. What never moves: the predecessor's votes, signatures,
// approvals, consent, private notes, credentials, personal messages or unrelated memberships — history
// stays attributed to whoever acted. An obligation left unaccepted stays visible as unresolved.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { pack_id, decision, return_reason, item_dispositions, notes } = body;

    if (!pack_id) return Response.json({ error: 'pack_id is required' }, { status: 400 });
    const accept = decision !== 'return';

    const auth = await authorizeCommand(base44, {
      capability: 'seat.handover_accept',
      target_type: 'HandoverPack',
      target_id: pack_id,
      ...requestClaims(body),
    });
    if (!auth.allowed) return refusalResponse(auth);
    const pack = auth.target;

    const gate = assessHandoverAcceptance({
      pack,
      actor_user_id: auth.user.id,
      decision: accept ? 'accept' : 'return',
      return_reason: return_reason || null,
    });
    if (!gate.ok) return contractRefusal(gate);

    const sr = base44.asServiceRole;
    const now = new Date().toISOString();
    const actorName = auth.user.full_name || auth.user.email;

    const key = `handover.decide:${pack_id}`;
    const claim = await claimTransition(base44, {
      key,
      command: 'AcceptHandover',
      entity_type: 'HandoverPack',
      entity_id: pack_id,
      committee_id: auth.trusted_target.derived_committee_id,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'This handover has already been decided');

    const items = await sr.entities.HandoverItem
      .filter({ pack_id }, { limit: 200 })
      .catch(() => []);
    const rows = Array.isArray(items) ? items : (items && items.items) || [];

    if (!accept) {
      await sr.entities.HandoverPack.update(pack_id, {
        status: 'returned',
        returned_at: now,
        return_reason,
        items_unresolved: rows.length,
        notes: notes || pack.notes || null,
      });
      await sr.entities.AuditEvent.create({
        organization_id: auth.organization_id, committee_id: pack.committee_id,
        actor_user_id: auth.user.id, actor_name: actorName, actor_email: auth.user.email,
        action: 'handover.return', entity_type: 'HandoverPack', entity_id: pack_id,
        description: `Handover returned for completion: ${return_reason}`,
        correlation_id: auth.correlation_id, authority_context: auth.authority_context,
      }).catch(() => null);
      await completeTransition(base44, claim.claim_id, { result_ref: pack_id });
      return Response.json({
        status: 'ok', pack_id, pack_status: 'returned', items_unresolved: rows.length,
        contract_version: CONTINUITY_VERSION, correlation_id: auth.correlation_id,
      });
    }

    // Approved dispositions: the successor's own choice where supplied, otherwise the proposed one.
    const overrides = new Map(
      (Array.isArray(item_dispositions) ? item_dispositions : [])
        .filter((d) => d && d.item_id)
        .map((d) => [d.item_id, d]),
    );

    const successorUserId = pack.successor_user_id;
    let assigned = 0, unresolved = 0, revokedPersonal = 0;
    const reassessed = [];
    const updates = [];

    for (const item of rows) {
      const override = overrides.get(item.id) || {};
      const disposition = override.disposition || item.disposition || item.proposed_disposition;
      const check = assessDisposition(disposition, { has_successor: !!successorUserId });
      if (!check.ok) {
        unresolved += 1;
        updates.push({ id: item.id, status: 'pending', reason: check.reason });
        continue;
      }

      // 1 — personal authority is revoked, never inherited.
      if (disposition === 'revoke_not_transferred') {
        if (item.source_entity_type === 'Delegation' && item.source_entity_id) {
          await sr.entities.Delegation.update(item.source_entity_id, {
            status: 'revoked',
            end_date: now.slice(0, 10),
          }).catch(() => null);
          reassessed.push(`Delegation ${item.source_entity_id}: revoked (personal authority is not handed over)`);
        }
        revokedPersonal += 1;
        updates.push({
          id: item.id, disposition, status: 'not_transferred',
          reason: 'Personal authority is revoked, never transferred',
          effective_at: now,
        });
        continue;
      }

      // 2 — future responsibility for a PERSONALLY OWNED obligation moves to the successor; the
      //     predecessor's part in it stays in the audit trail, and the record remembers where it came from.
      if (disposition === 'assign_to_successor' && item.source_entity_type === 'Action' && item.source_entity_id) {
        await sr.entities.Action.update(item.source_entity_id, {
          owner_user_id: successorUserId,
          owner_name: pack.successor_name || null,
          handover_pack_id: pack_id,
          handover_from_user_id: pack.predecessor_user_id || null,
        }).catch(() => null);
        reassessed.push(`Action ${item.source_entity_id}: future responsibility assigned once to the successor`);
      }

      // 3 — committee-level obligations (agenda items, meetings, reviews, custody) stay with the SEAT
      //     and the institution; the item records who is accountable for following them up. Continuity
      //     belongs to the institution and the seat — the source record is not rewritten.
      updates.push({
        id: item.id, disposition, status: 'accepted',
        destination_seat_id: override.destination_seat_id || pack.successor_membership_id || null,
        destination_name: override.destination_name || pack.successor_name || null,
        effective_at: now,
        reason: item.predecessor_private ? 'Institutional follow-up only; private content excluded' : null,
      });
      assigned += 1;
    }

    for (const u of updates) {
      await sr.entities.HandoverItem.update(u.id, u).catch(() => null);
    }

    const packStatus = unresolved > 0 ? 'partially_accepted' : 'accepted';
    await sr.entities.HandoverPack.update(pack_id, {
      status: packStatus,
      accepted_at: now,
      accepted_by_user_id: auth.user.id,
      accepted_by_name: actorName,
      items_assigned: assigned,
      items_unresolved: unresolved,
      personal_items_revoked: revokedPersonal,
      reassessed_delegations: reassessed,
      notes: notes || pack.notes || null,
    });

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: pack.committee_id,
      actor_user_id: auth.user.id, actor_name: actorName, actor_email: auth.user.email,
      action: 'handover.accept', entity_type: 'HandoverPack', entity_id: pack_id,
      description: `Handover ${packStatus}: ${assigned} obligation(s) assigned once, ${unresolved} unresolved, ${revokedPersonal} personal item(s) revoked.`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    }).catch(() => null);

    await completeTransition(base44, claim.claim_id, { result_ref: pack_id });

    return Response.json({
      status: 'ok',
      pack_id,
      pack_status: packStatus,
      items_assigned: assigned,
      items_unresolved: unresolved,
      personal_items_revoked: revokedPersonal,
      reassessed_delegations: reassessed,
      dispositions_available: Object.keys(HANDOVER_DISPOSITIONS),
      predecessor_actions_preserved: true,
      contract_version: CONTINUITY_VERSION,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message, code: 'unexpected_error', contract_version: CONTINUITY_VERSION }, { status: 500 });
  }
}

function contractRefusal(r) {
  return Response.json(
    { error: r.reason, error_ar: r.reason_ar, code: r.code, contract_version: r.contract_version || CONTINUITY_VERSION },
    { status: r.status || 409 },
  );
}