import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse, requestClaims } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';
import {
  CONTINUITY_VERSION,
  HANDOVER_EXCLUDED,
  proposeDisposition,
  refusal,
} from '../../shared/continuityContract.ts';

// InitiateHandover — the institution enumerates what is open before a seat changes hands.
//
// The inventory is read SERVER-SIDE, from the committee's own records: nobody has to trust a client's
// list of "what I was working on", and a departing person is never required to log in for the
// institution to continue. Every obligation gets a PROPOSED disposition; a human approves it. Personal
// authority (the outgoing person's own delegations) is proposed for REVOCATION, never transfer.
//
// Coverage is reported honestly: the sources actually read are listed in `inventory_sources`, and the
// ones not read are named as unresolved — an unread obligation must not look like a completed handover.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      membership_id, successor_membership_id, successor_user_id, successor_name,
      effective_date, approving_authority, history_scope, notes,
    } = body;

    if (!membership_id) return Response.json({ error: 'membership_id is required' }, { status: 400 });

    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'CommitteeMembership',
      target_id: membership_id,
      ...requestClaims(body),
    });
    if (!auth.allowed) return refusalResponse(auth);
    const seat = auth.target;
    const sr = base44.asServiceRole;
    const committeeId = auth.trusted_target.derived_committee_id;
    const now = new Date().toISOString();
    const effective = effective_date || now.slice(0, 10);

    let successor = null;
    if (successor_membership_id) {
      successor = await sr.entities.CommitteeMembership.get(successor_membership_id).catch(() => null);
    }
    if (!successor && successor_user_id) {
      const rows = await sr.entities.CommitteeMembership
        .filter({ committee_id: committeeId, user_id: successor_user_id, status: 'active' }, { limit: 5 })
        .catch(() => []);
      successor = (rows || [])[0] || null;
    }

    const key = `handover.initiate:${membership_id}:${effective}`;
    const claim = await claimTransition(base44, {
      key,
      command: 'InitiateHandover',
      entity_type: 'CommitteeMembership',
      entity_id: membership_id,
      committee_id: committeeId,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'A handover for this seat and date is already raised');

    // ── The inventory: bounded, server-side reads of the obligations this seat actually holds.
    const sourcesRead = [];
    const sourcesNotRead = [];
    const obligations = [];
    const outgoingUserId = seat.user_id || null;

    if (outgoingUserId) {
      const actions = await readList(sr.entities.Action, {
        committee_id: committeeId, owner_user_id: outgoingUserId,
        status: { $in: ['assigned', 'in_progress', 'blocked', 'evidence_pending', 'under_review', 'overdue'] },
      }, sourcesRead, sourcesNotRead, 'Action');
      for (const a of actions) {
        obligations.push({
          obligation_type: 'open_action', source_entity_type: 'Action', source_entity_id: a.id,
          title: a.title_ar || a.title || a.title_en, due_date: a.deadline || null, source_status: a.status,
        });
      }

      const reviews = await readList(sr.entities.ReviewRequest, {
        committee_id: committeeId, reviewer_user_id: outgoingUserId,
        status: { $in: ['pending', 'accepted', 'in_review', 'overdue'] },
      }, sourcesRead, sourcesNotRead, 'ReviewRequest');
      for (const r of reviews) {
        obligations.push({
          obligation_type: 'review_request', source_entity_type: 'ReviewRequest', source_entity_id: r.id,
          title: r.instructions || r.review_type, due_date: r.due_date || null, source_status: r.status,
        });
      }

      const delegations = await readList(sr.entities.Delegation, {
        committee_id: committeeId, from_user_id: outgoingUserId, status: 'active',
      }, sourcesRead, sourcesNotRead, 'Delegation');
      for (const d of delegations) {
        obligations.push({
          obligation_type: 'personal_delegation', source_entity_type: 'Delegation', source_entity_id: d.id,
          title: `تفويض إلى ${d.to_member_name || ''}`.trim(), due_date: d.end_date || null,
          source_status: d.status, predecessor_private: false,
        });
      }
    }

    const agenda = await readList(sr.entities.AgendaItem, {
      committee_id: committeeId, status: { $in: ['pending', 'in_discussion', 'deferred'] },
    }, sourcesRead, sourcesNotRead, 'AgendaItem');
    for (const a of agenda) {
      obligations.push({
        obligation_type: 'agenda_item', source_entity_type: 'AgendaItem', source_entity_id: a.id,
        title: a.title_ar || a.title || a.title_en, due_date: null, source_status: a.status,
      });
    }

    const meetings = await readList(sr.entities.Meeting, {
      committee_id: committeeId, status: 'scheduled', date: { $gte: now },
    }, sourcesRead, sourcesNotRead, 'Meeting');
    for (const m of meetings) {
      obligations.push({
        obligation_type: 'upcoming_meeting', source_entity_type: 'Meeting', source_entity_id: m.id,
        title: m.title_ar || m.title || m.title_en, due_date: (m.date || '').slice(0, 10), source_status: m.status,
      });
    }

    // Named as NOT read: an institution must see the boundary of its own inventory, not a green tick.
    sourcesNotRead.push('Signature (pending signatures)', 'WorkstreamMembership (working-group roles)', 'Document (custodial documents)');

    // ── The pack.
    const pack = await sr.entities.HandoverPack.create({
      organization_id: auth.organization_id,
      committee_id: committeeId,
      predecessor_membership_id: membership_id,
      predecessor_user_id: outgoingUserId,
      predecessor_name: seat.full_name_ar || seat.full_name || null,
      successor_membership_id: successor ? successor.id : null,
      successor_user_id: successor ? successor.user_id : null,
      successor_name: successor ? (successor.full_name_ar || successor.full_name) : (successor_name || null),
      approving_authority: approving_authority || null,
      effective_date: effective,
      history_scope: history_scope || 'committee_record',
      items_total: obligations.length,
      items_assigned: 0,
      items_unresolved: obligations.length,
      personal_items_revoked: 0,
      inventory_sources: sourcesRead,
      inventory_not_read: sourcesNotRead,
      reassessed_delegations: [],
      excluded_from_handover: HANDOVER_EXCLUDED.map((x) => x.key),
      status: 'pending_acceptance',
      correlation_id: auth.correlation_id,
      contract_version: CONTINUITY_VERSION,
      notes: notes || null,
    });

    const items = obligations.map((o) => ({
      organization_id: auth.organization_id,
      committee_id: committeeId,
      pack_id: pack.id,
      obligation_type: o.obligation_type,
      source_entity_type: o.source_entity_type,
      source_entity_id: o.source_entity_id,
      title: o.title || '—',
      due_date: o.due_date,
      source_status: o.source_status,
      proposed_disposition: proposeDisposition(o.obligation_type),
      disposition: null,
      destination_seat_id: null,
      destination_name: null,
      predecessor_private: !!o.predecessor_private,
      status: 'pending',
      contract_version: CONTINUITY_VERSION,
    }));
    const created = items.length > 0 ? await sr.entities.HandoverItem.bulkCreate(items) : [];

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: committeeId,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'handover.initiate', entity_type: 'HandoverPack', entity_id: pack.id,
      entity_title: seat.full_name_ar || seat.full_name || '',
      description: `Handover raised for ${obligations.length} open obligation(s); sources read: ${sourcesRead.join(', ') || 'none'}; not read: ${sourcesNotRead.join(', ')}.`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    }).catch(() => null);

    await completeTransition(base44, claim.claim_id, { result_ref: pack.id });

    return Response.json({
      status: 'ok',
      pack_id: pack.id,
      pack_status: pack.status,
      items_total: obligations.length,
      inventory_sources: sourcesRead,
      inventory_sources_not_read: sourcesNotRead,
      requires_successor: !successor,
      successor_user_id: successor ? successor.user_id : null,
      obligations: (Array.isArray(created) ? created : items).map((i) => ({
        item_id: i.id || null, obligation_type: i.obligation_type, title: i.title,
        proposed_disposition: i.proposed_disposition, due_date: i.due_date || null,
      })),
      contract_version: CONTINUITY_VERSION,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message, code: 'unexpected_error', contract_version: CONTINUITY_VERSION }, { status: 500 });
  }
}

async function readList(entity, filter, sourcesRead, sourcesNotRead, name) {
  try {
    const rows = await entity.filter(filter, { limit: 100 });
    sourcesRead.push(name);
    return Array.isArray(rows) ? rows : (rows && rows.items) || [];
  } catch (_e) {
    // A read that FAILED is not an empty list: it is named as not read, so the pack cannot look complete.
    sourcesNotRead.push(`${name} (read failed)`);
    return [];
  }
}

function contractRefusal(r) {
  return Response.json(
    { error: r.reason, error_ar: r.reason_ar, code: r.code, contract_version: r.contract_version || CONTINUITY_VERSION },
    { status: r.status || 409 },
  );
}