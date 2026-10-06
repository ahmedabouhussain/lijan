import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  PRINCIPAL_BASES, PRINCIPAL_BASIS_VALUES, PRINCIPAL_AUTHORIZED_CHOICES, PRINCIPAL_REFUSALS,
  PRINCIPAL_REPRESENTATION_VERSION, principalBasisKey,
} from '../../shared/principalRepresentation.ts';

// SetPrincipalBasis — the institution records the ONE thing the platform refuses to assume: whether a
// person holding more than one voting seat carries two votes or one.
//
// Written under the committee-management right, on the committee's own record — never inline in a
// round, and never by the seat that opens a round. A round opened on a basis its opener wrote for
// itself would be the defect already settled for circulation policy and for evidence acceptance
// (the performer does not write the rule it will be judged by).
//
// Until this is recorded, a committee whose electorate actually contains a dual-seat holder cannot
// open a vote or dispatch a written resolution: the affected act stops with the choice named, and
// nothing is decided for the institution (D-083).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { committee_id, basis, basis_reference = null } = body;

    if (!committee_id || !basis) {
      return Response.json({ error: 'committee_id and basis are required', recognized: PRINCIPAL_BASIS_VALUES }, { status: 400 });
    }

    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    if (!PRINCIPAL_BASIS_VALUES.includes(basis)) {
      return Response.json({
        error: PRINCIPAL_REFUSALS.principal_basis_invalid.en,
        error_ar: PRINCIPAL_REFUSALS.principal_basis_invalid.ar,
        code: 'principal_basis_invalid',
        recorded_basis: basis,
        recognized: PRINCIPAL_BASIS_VALUES,
        authorized_choices: PRINCIPAL_AUTHORIZED_CHOICES,
        correlation_id: auth.correlation_id,
      }, { status: 400 });
    }

    // The instrument the choice rests on is what makes it the institution's rule rather than a
    // convenience: without a reference the choice is recorded but flagged as unsourced in its own row.
    const config_key = principalBasisKey(committee_id);
    const existingRows = await sr.entities.GovernanceConfig.filter({ config_key }, { limit: 1 }).catch(() => []);
    const existing = (existingRows && existingRows[0]) || null;
    const previous = existing && existing.payload ? { basis: existing.payload.basis || null, policy_version: existing.payload.policy_version || null } : null;

    const payload = {
      basis,
      basis_reference,
      policy_version: `${PRINCIPAL_REPRESENTATION_VERSION}:${Date.now()}`,
      contract_version: PRINCIPAL_REPRESENTATION_VERSION,
      previous_basis: previous && previous.basis ? previous.basis : null,
      recorded_by_user_id: auth.user.id,
      recorded_by_name: auth.user.full_name || auth.user.email,
      recorded_at: new Date().toISOString(),
    };

    const saved = existing
      ? await sr.entities.GovernanceConfig.update(existing.id, { payload })
      : await sr.entities.GovernanceConfig.create({ config_key, payload });

    // A superseded choice is preserved in the audit trail: the rule a past round was decided under is
    // never rewritten silently.
    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'principal.basis_recorded', entity_type: 'GovernanceConfig', entity_id: saved.id,
      entity_title: 'أساس تصويت متعدد المقاعد',
      description: `Voting basis recorded as ${basis}${basis_reference ? ` (basis: ${basis_reference})` : ' (no instrument reference stated)'}${previous && previous.basis && previous.basis !== basis ? ` — supersedes ${previous.basis}` : ''}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      config_key,
      basis,
      basis_reference,
      previous_basis: payload.previous_basis,
      policy_version: payload.policy_version,
      contract_version: PRINCIPAL_REPRESENTATION_VERSION,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}