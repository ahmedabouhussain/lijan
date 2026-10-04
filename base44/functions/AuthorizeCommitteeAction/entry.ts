import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveAuthority, evaluateActionPolicy, capabilitiesForRole, AUTHORITY_POLICY_VERSION } from '../../shared/authorityKernel.ts';

// AuthorizeCommitteeAction — the single callable guard.
//
// Every protected surface and every backend command asks THIS one question and gets ONE answer,
// produced by one policy table at one version. It performs no write of its own; the only side
// effect is a safe audit record when a request carries a scope that contradicts the target record.
//
// It exists so that:
//   • a surface never has to re-implement role logic to decide whether to show a control,
//   • a command never has to trust a role or a scope it received from the client,
//   • the same inputs always produce the same decision, whatever path asked for it.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized', code: 'unauthenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // Authority-relevant client fields are accepted for LOOKUP and CONSISTENCY CHECKS only.
    // organization_id, role, person_id, membership_id, seat_id, is_admin, can_sign, can_approve
    // and showcase_dataset_id are never read here as an authority source.
    const { capability, record_id, entity_type, committee_id, record_committee_id } = body || {};

    if (!capability) {
      return Response.json({ error: 'capability is required', code: 'invalid_capability' }, { status: 400 });
    }

    let record = null;
    if (record_id && entity_type) {
      record = await base44.asServiceRole.entities[entity_type]?.get(record_id).catch(() => null) || null;
      if (!record) {
        return Response.json({ error: 'The target record could not be resolved in your scope', code: 'not_found' }, { status: 404 });
      }
    }
    // A caller may describe where it believes the record lives; a contradiction is refused, never honoured.
    const claimed = committee_id || record_committee_id || null;

    // This endpoint is the read-only PROBE surfaces use to decide whether to show a control. It
    // writes nothing itself, so it is not a command site and needs no trusted target: the invariant
    // that matters — no WRITE is ever authorized on client-supplied scope — binds the commands.
    // When a caller does name a record, that record IS the scope, and a contradicting committee claim
    // is refused by the kernel rather than honoured.
    const decision = await resolveAuthority(base44, { capability, record, committee_id: claimed });

    return Response.json({
      allowed: decision.allowed,
      code: decision.code || null,
      reason: decision.reason || null,
      capability,
      policy_version: AUTHORITY_POLICY_VERSION,
      effective_role: decision.effective_role || null,
      capabilities: decision.capabilities || [],
      scope: {
        committee_id: decision.committee_id || null,
        organization_id: decision.organization_id || null,
        derived_from: record ? 'target_record' : 'lookup_hint',
      },
      delegation: decision.delegation || null,
      delegation_applied: decision.delegation_applied === true,
      grant_status: decision.grant_status || null,
      recusal_legacy_name_match: decision.recusal_legacy_name_match === true,
      authority_context: decision.authority_context || null,
      correlation_id: decision.correlation_id,
    }, { status: decision.allowed ? 200 : (decision.status || 403) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}