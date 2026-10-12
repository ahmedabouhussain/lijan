import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { AI_ACCOUNTABILITY_VERSION, AI_INCIDENT_TYPES, AI_INCIDENT_SEVERITY, AI_INCIDENT_STATUS, INCIDENT_STANDARD_MAP } from '../../shared/aiAccountability.ts';

// RecordAIIncident — تسجيل حادثة ذكاء اصطناعي (NIST AI RMF — MEASURE/MANAGE).
// حادثة الذكاء حدثٌ أدى أو كاد يؤدي إلى ضرر على فعل حوكمة. ليست لومًا بل سجلًا قابلاً للتدقيق.
// السلطة: عضو لجنة يقرأها (read) قد يسجّل حادثة؛ المدير قد يسجّل على أي لجنة.

const VALID_TYPES = Object.keys(AI_INCIDENT_TYPES);
const VALID_SEVERITY = Object.keys(AI_INCIDENT_SEVERITY);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    const {
      committee_id, output_ledger_id, output_type, incident_type, severity,
      title, description, affected_entity_type, affected_entity_id,
      root_cause_category, standard_reference, remediation_action,
    } = body;

    if (!committee_id) return Response.json({ error: 'committee_id is required', code: 'missing_committee' }, { status: 400 });
    if (!VALID_TYPES.includes(incident_type)) return Response.json({ error: 'invalid incident_type', code: 'invalid_type', valid: VALID_TYPES }, { status: 400 });
    if (!VALID_SEVERITY.includes(severity)) return Response.json({ error: 'invalid severity', code: 'invalid_severity', valid: VALID_SEVERITY }, { status: 400 });
    if (!title || !description) return Response.json({ error: 'title and description are required', code: 'missing_fields' }, { status: 400 });

    // السلطة: قراءة على اللجنة — من يقرأ اللجنة قد يسجّل حادثة عليها
    const auth = await authorizeCommand(base44, { capability: 'read', target_type: 'Committee', target_id: committee_id });
    if (!auth.allowed) return refusalResponse(auth);

    const committeeId = auth.trusted_target?.derived_committee_id || committee_id;
    const now = new Date().toISOString();
    const correlation_id = 'ai_incident_' + Date.now().toString(36);

    const record = await base44.asServiceRole.entities.AIIncident.create({
      organization_id: auth.trusted_target?.organization_id || user.data?.active_org_id || null,
      committee_id: committeeId,
      output_ledger_id: output_ledger_id || null,
      output_type: output_type || null,
      incident_type,
      severity,
      standard_reference: standard_reference || INCIDENT_STANDARD_MAP[incident_type] || null,
      title,
      description,
      affected_entity_type: affected_entity_type || null,
      affected_entity_id: affected_entity_id || null,
      root_cause_category: root_cause_category || 'undetermined',
      detected_by_user_id: user.id,
      detected_by_name: user.full_name || user.email,
      detected_at: now,
      status: 'open',
      remediation_action: remediation_action || null,
      contract_version: AI_ACCOUNTABILITY_VERSION,
      correlation_id,
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: record.organization_id,
      committee_id: committeeId,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: 'create',
      entity_type: 'AIIncident',
      entity_id: record.id,
      entity_title: title,
      description: `AI incident recorded: ${incident_type} (${severity})`,
      correlation_id,
    });

    return Response.json({
      status: 'ok',
      incident_id: record.id,
      contract_version: AI_ACCOUNTABILITY_VERSION,
      message: 'Incident recorded. It will appear on the AI Accountability Report for this committee and for the national oversight body.',
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}