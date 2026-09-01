import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { ENTITY_CAPABILITY_MAP, authorizeForRecord, logAuditEvent, generateCorrelationId, getRecordTitle } from '../../shared/recordGovernance.ts';

// CreateCommitteeRecord — creates a new record in draft state.
// Requires the entity-specific capability. Record is created with status=draft, version=1.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { entity_type, committee_id, fields } = body;
    if (!entity_type || !committee_id || !fields) {
      return Response.json({ error: 'entity_type, committee_id, and fields are required' }, { status: 400 });
    }

    const requiredCap = ENTITY_CAPABILITY_MAP[entity_type];
    if (!requiredCap) return Response.json({ error: `Unknown entity type: ${entity_type}` }, { status: 400 });

    const auth = await authorizeForRecord(base44, user, committee_id, requiredCap);
    if (auth.error) return Response.json(auth.error, { status: auth.error.status });

    const { committee, capabilities } = auth;
    const correlationId = generateCorrelationId(`create-${entity_type.toLowerCase()}`);

    const record = await base44.asServiceRole.entities[entity_type].create({
      ...fields,
      organization_id: committee.organization_id,
      committee_id: committee.id,
      status: fields.status || 'draft',
      version: 1,
    });

    await logAuditEvent(base44, {
      organization_id: committee.organization_id,
      committee_id: committee.id,
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      action: 'create',
      entity_type,
      entity_id: record.id,
      entity_title: getRecordTitle(record, entity_type),
      description: `Created ${entity_type} record in draft state`,
      new_value: fields,
      authority_context: `capability:${requiredCap};role:${capabilities.effective_committee_role}`,
      correlation_id: correlationId,
    });

    return Response.json({ record, correlation_id: correlationId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}