import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { ENTITY_CAPABILITY_MAP, authorizeForRecord, logAuditEvent, generateCorrelationId, checkConcurrency, isEditable, getRecordTitle } from '../../shared/recordGovernance.ts';

// UpdateCommitteeDraftRecord — updates a record that is in an editable workflow state.
// Protected records (issued, approved, signed, etc.) are rejected with 409.
// Includes optimistic concurrency: if expected_version doesn't match, returns 409 conflict.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { entity_type, committee_id, record_id, fields, expected_version } = body;
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

    if (record.committee_id !== committee.id) {
      return Response.json({ error: 'Record does not belong to this committee' }, { status: 403 });
    }

    if (!isEditable(record.status)) {
      return Response.json({
        error: 'Record is protected and cannot be directly edited',
        status: record.status,
        hint: 'Use SupersedeOfficialRecord for protected records',
      }, { status: 409 });
    }

    const concurrency = checkConcurrency(record, expected_version);
    if (concurrency.conflict) {
      return Response.json({
        error: 'Version conflict: record was modified by another user',
        current_version: concurrency.current_version,
        expected_version: concurrency.expected_version,
        current_record: record,
      }, { status: 409 });
    }

    const correlationId = generateCorrelationId(`update-${entity_type.toLowerCase()}`);
    const oldValues = { ...record };

    const updated = await base44.asServiceRole.entities[entity_type].update(record_id, {
      ...fields,
      version: (record.version || 1) + 1,
    });

    await logAuditEvent(base44, {
      organization_id: committee.organization_id,
      committee_id: committee.id,
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      action: 'update',
      entity_type,
      entity_id: record_id,
      entity_title: getRecordTitle(record, entity_type),
      description: `Updated ${entity_type} record (editable state: ${record.status})`,
      old_value: oldValues,
      new_value: fields,
      authority_context: `capability:${requiredCap};role:${capabilities.effective_committee_role}`,
      correlation_id: correlationId,
    });

    return Response.json({ record: updated, correlation_id: correlationId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}