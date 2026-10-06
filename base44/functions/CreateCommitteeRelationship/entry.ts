import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse, requestClaims } from '../../shared/commandGuard.ts';
import {
  STRUCTURE_VERSION,
  REVIEW_OR_OVERTURN,
  RELATIONSHIP_TYPES,
  assertRelationshipShape,
  detectAuthorityCycle,
  validateInterCommitteeDelegation,
} from '../../shared/committeeStructure.ts';

// CreateCommitteeRelationship — the ONE way a typed relationship between committees is recorded.
//
// The type is the point: a parent, a subcommittee, an advisory group, a joint committee, and — kept
// apart — the body that appoints, the body that ratifies, the body that merely RECEIVES reports and
// the body that oversees. "Reported to" must never be read as "approved by", and a relationship that
// would make a body its own parent, appointer or ratifier is refused before it is written.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      committee_id, counterparty_committee_id, relationship_type, direction,
      legal_basis, basis_reference, basis_document_id, scope,
      delegated_capabilities, reserved_matters, review_or_overturn, ratification_required,
      reporting_obligation, escalation_route, owner_seat_id, owner_name,
      start_date, end_date, delegation_expires_at, notes,
    } = body;

    if (!committee_id || !counterparty_committee_id || !relationship_type) {
      return Response.json({ error: 'committee_id, counterparty_committee_id and relationship_type are required' }, { status: 400 });
    }

    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committee_id,
      mode: 'create',
      ...requestClaims(body),
    });
    if (!auth.allowed) return refusalResponse(auth);

    const sr = base44.asServiceRole;
    const counterparty = await sr.entities.Committee.get(counterparty_committee_id).catch(() => null);
    if (!counterparty || counterparty.merge_status === 'merged_duplicate') {
      const text = RELATIONSHIP_TYPES[relationship_type] ? null : null;
      return Response.json({
        error: 'The counterparty committee does not exist',
        error_ar: 'اللجنة المقابلة غير موجودة',
        code: 'missing_counterparty',
        contract_version: STRUCTURE_VERSION,
      }, { status: 404 });
    }

    const shape = assertRelationshipShape({
      subject_committee_id: committee_id,
      counterparty_committee_id,
      relationship_type,
      legal_basis,
      counterparty_exists: true,
    });
    if (shape) return contractRefusal(shape);

    // A delegation from a parent to a child is bounded on four sides, and the delegator's own
    // capabilities are the envelope — never a client claim about what the parent may do.
    const delegation = validateInterCommitteeDelegation({
      delegated_capabilities,
      reserved_matters: reserved_matters === undefined ? null : reserved_matters,
      expires_at: delegation_expires_at || null,
      delegatorCapabilities: auth.capabilities || [],
      relation_type: relationship_type,
    });
    if (delegation) return contractRefusal(delegation);

    const review = REVIEW_OR_OVERTURN.includes(review_or_overturn) ? review_or_overturn : 'none';

    // Idempotence: the same typed link, still in force, is reported instead of duplicated.
    const existing = await sr.entities.CommitteeRelationship
      .filter({ committee_id, counterparty_committee_id, relationship_type, status: { $in: ['proposed', 'active'] } }, { limit: 5 })
      .catch(() => []);
    if ((existing || [])[0]) {
      return Response.json({
        status: 'ok', relationship_id: existing[0].id, idempotent: true,
        contract_version: STRUCTURE_VERSION, correlation_id: auth.correlation_id,
      });
    }

    // Cycle check over the neighbourhood of both committees (bounded reads, never a whole-table scan).
    const edges = await sr.entities.CommitteeRelationship.filter({
      $or: [
        { committee_id: { $in: [committee_id, counterparty_committee_id] } },
        { counterparty_committee_id: { $in: [committee_id, counterparty_committee_id] } },
      ],
    }, { limit: 200 }).catch(() => []);
    const candidate = {
      committee_id,
      counterparty_committee_id,
      relationship_type,
      direction: direction === 'inbound' ? 'inbound' : 'outbound',
    };
    const cycle = detectAuthorityCycle(edges || [], candidate);
    if (cycle) return contractRefusal(cycle);

    const record = await sr.entities.CommitteeRelationship.create({
      organization_id: auth.organization_id,
      committee_id,
      counterparty_committee_id,
      counterparty_name_ar: counterparty.name_ar || counterparty.name_en || null,
      counterparty_name_en: counterparty.name_en || counterparty.name_ar || null,
      relationship_type,
      direction: candidate.direction,
      legal_basis: legal_basis || null,
      basis_reference: basis_reference || null,
      basis_document_id: basis_document_id || null,
      scope: scope || null,
      delegated_capabilities: Array.isArray(delegated_capabilities) ? delegated_capabilities.filter(Boolean) : [],
      reserved_matters: reserved_matters === undefined ? null : reserved_matters,
      review_or_overturn: review,
      ratification_required: ratification_required === true,
      reporting_obligation: reporting_obligation || null,
      escalation_route: escalation_route || null,
      owner_seat_id: owner_seat_id || null,
      owner_name: owner_name || auth.user.full_name || auth.user.email,
      start_date: start_date || null,
      end_date: end_date || null,
      effective_from: new Date().toISOString(),
      status: 'active',
      cycle_checked: true,
      delegation_expires_at: delegation_expires_at || null,
      contract_version: STRUCTURE_VERSION,
      relationship_notes: notes || null,
      created_by_name: auth.user.full_name || auth.user.email,
    });

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'committee.relationship.create', entity_type: 'CommitteeRelationship', entity_id: record.id,
      entity_title: `${relationship_type} → ${counterparty.name_ar || counterparty.name_en || ''}`,
      description: `Typed relationship recorded with basis '${legal_basis || ''}'; authority cycle checked; delegation bounds applied.`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    }).catch(() => null);

    return Response.json({
      status: 'ok',
      relationship_id: record.id,
      relationship_type,
      conveys_approval: RELATIONSHIP_TYPES[relationship_type].conveys_approval === true,
      contract_version: STRUCTURE_VERSION,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message, code: 'unexpected_error', contract_version: STRUCTURE_VERSION }, { status: 500 });
  }
}

function contractRefusal(r) {
  return Response.json(
    { error: r.reason, error_ar: r.reason_ar, code: r.code, contract_version: r.contract_version || STRUCTURE_VERSION },
    { status: r.status || 409 },
  );
}