import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { ENTITY_CAPABILITY_MAP, authorizeForRecord, logAuditEvent, generateCorrelationId, isEditable, getRecordTitle } from '../../shared/recordGovernance.ts';

// PublishCommitteeRecord — transitions a record from draft/in_review to published/issued.
// Once published, the record is protected and can only be modified via SupersedeOfficialRecord.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { entity_type, committee_id, record_id, publish_status, reason } = body;
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
      return Response.json({ error: 'Record is not in a publishable state', status: record.status }, { status: 409 });
    }

    const correlationId = generateCorrelationId(`publish-${entity_type.toLowerCase()}`);
    const newStatus = publish_status || 'issued';
    const updated = await base44.asServiceRole.entities[entity_type].update(record_id, {
      status: newStatus,
      version: (record.version || 1) + 1,
      published_by_name: user.full_name || user.email,
      published_by_user_id: user.id,
      published_at: new Date().toISOString(),
    });

    await logAuditEvent(base44, {
      organization_id: committee.organization_id,
      committee_id: committee.id,
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      action: 'issue',
      entity_type, entity_id: record_id,
      entity_title: getRecordTitle(record, entity_type),
      description: `Published ${entity_type} as ${newStatus}. Reason: ${reason || 'No reason provided'}`,
      old_value: { status: record.status },
      new_value: { status: newStatus, published_by: user.full_name || user.email },
      authority_context: `capability:${requiredCap};role:${capabilities.effective_committee_role}`,
      correlation_id: correlationId,
    });

    return Response.json({ record: updated, correlation_id: correlationId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}