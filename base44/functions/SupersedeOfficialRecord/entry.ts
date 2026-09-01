import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeForRecord, logAuditEvent, generateCorrelationId, getRecordTitle } from '../../shared/recordGovernance.ts';

// SupersedeOfficialRecord — creates a new version of a protected official record.
// The original record is preserved (marked as superseded), and a new version is created.
// Requires can_supersede_official_records (chair or org admin).
// This is the governed path for correcting/amending official records.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { entity_type, committee_id, record_id, fields, reason, expected_version } = body;
    if (!entity_type || !committee_id || !record_id || !reason) {
      return Response.json({ error: 'entity_type, committee_id, record_id, and reason are required' }, { status: 400 });
    }

    // Superseding requires the highest authority
    const auth = await authorizeForRecord(base44, user, committee_id, 'can_supersede_official_records');
    if (auth.error) return Response.json(auth.error, { status: auth.error.status });

    const { committee, capabilities } = auth;

    const record = await base44.asServiceRole.entities[entity_type].get(record_id).catch(() => null);
    if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });

    if (record.committee_id !== committee.id) {
      return Response.json({ error: 'Record does not belong to this committee' }, { status: 403 });
    }

    // Optimistic concurrency
    if (expected_version !== undefined && record.version !== undefined && record.version !== expected_version) {
      return Response.json({
        error: 'Version conflict',
        current_version: record.version,
        expected_version,
      }, { status: 409 });
    }

    const correlationId = generateCorrelationId(`supersede-${entity_type.toLowerCase()}`);
    const oldValues = { ...record };

    // Mark old record as superseded (preserve it — never delete)
    await base44.asServiceRole.entities[entity_type].update(record_id, {
      status: 'superseded',
      version: (record.version || 1) + 1,
    });

    // Create new version with updated fields
    const { id: _oldId, created_date: _cd, updated_date: _ud, created_by_id: _cb, ...rest } = record;
    const newRecord = await base44.asServiceRole.entities[entity_type].create({
      ...rest,
      ...fields,
      organization_id: committee.organization_id,
      committee_id: committee.id,
      status: fields.status || 'issued',
      version: 1,
    });

    // Link old → new
    await base44.asServiceRole.entities[entity_type].update(record_id, {
      superseded_by: newRecord.id,
    });

    await logAuditEvent(base44, {
      organization_id: committee.organization_id,
      committee_id: committee.id,
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      action: 'sign',
      entity_type,
      entity_id: record_id,
      entity_title: getRecordTitle(record, entity_type),
      description: `Superseded ${entity_type} record. Reason: ${reason}. New version: ${newRecord.id}`,
      old_value: oldValues,
      new_value: fields,
      authority_context: `capability:can_supersede_official_records;role:${capabilities.effective_committee_role}`,
      correlation_id: correlationId,
    });

    return Response.json({
      superseded_record_id: record_id,
      new_record: newRecord,
      correlation_id: correlationId,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}