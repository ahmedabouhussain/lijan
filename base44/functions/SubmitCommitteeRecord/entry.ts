import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { ENTITY_CAPABILITY_MAP, authorizeForRecord, logAuditEvent, generateCorrelationId, isEditable, getRecordTitle } from '../../shared/recordGovernance.ts';

// SubmitCommitteeRecord — transitions a record from an editable state to in_review/submitted.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { entity_type, committee_id, record_id } = body;
    if (!entity_type || !committee_id || !record_id) {
      return Response.json({ error: 'entity_type, committee_id, and record_id are required' }, { status: 400 });
    }

    const requiredCap = ENTITY_CAPABILITY_MAP[entity_type];
    if (!requiredCap) return Response.json({ error: `Unknown entity type` }, { status: 400 });

    const auth = await authorizeForRecord(base44, user, committee_id, requiredCap);
    if (auth.error) return Response.json(auth.error, { status: auth.error.status });

    const { committee, capabilities } = auth;
    const record = await base44.asServiceRole.entities[entity_type].get(record_id).catch(() => null);
    if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });
    if (record.committee_id !== committee.id) return Response.json({ error: 'Cross-committee access denied' }, { status: 403 });

    if (!isEditable(record.status)) {
      return Response.json({ error: 'Record cannot be submitted from its current state', status: record.status }, { status: 409 });
    }

    const correlationId = generateCorrelationId(`submit-${entity_type.toLowerCase()}`);
    const updated = await base44.asServiceRole.entities[entity_type].update(record_id, {
      status: 'in_review',
      version: (record.version || 1) + 1,
    });

    await logAuditEvent(base44, {
      organization_id: committee.organization_id,
      committee_id: committee.id,
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      action: 'approve',
      entity_type, entity_id: record_id,
      entity_title: getRecordTitle(record, entity_type),
      description: `Submitted ${entity_type} for review`,
      old_value: { status: record.status },
      new_value: { status: 'in_review' },
      authority_context: `capability:${requiredCap};role:${capabilities.effective_committee_role}`,
      correlation_id: correlationId,
    });

    return Response.json({ record: updated, correlation_id: correlationId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}