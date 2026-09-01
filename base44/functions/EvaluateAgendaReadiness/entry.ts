import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// EvaluateAgendaReadiness — evaluates evidence readiness for an agenda item.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { agenda_item_id } = body;

    if (!agenda_item_id) return Response.json({ error: 'agenda_item_id is required' }, { status: 400 });

    const item = await base44.asServiceRole.entities.AgendaItem.get(agenda_item_id);
    if (!item) return Response.json({ error: 'Agenda item not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: item.committee_id, capability: 'read' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    // Get evidence requirements
    const requirements = await base44.asServiceRole.entities.AgendaItemEvidenceRequirement
      .filter({ agenda_item_id }).catch(() => []);

    const mandatory = (requirements || []).filter(r => r.is_mandatory);
    const satisfied = mandatory.filter(r => r.satisfied || r.waived);
    const missing = mandatory.filter(r => !r.satisfied && !r.waived);

    const readinessScore = mandatory.length > 0 ? Math.round((satisfied.length / mandatory.length) * 100) : 100;
    const readiness = missing.length === 0 ? 'ready' : (missing.length <= mandatory.length / 2 ? 'needs_attention' : 'not_ready');

    // Update the agenda item readiness
    await base44.asServiceRole.entities.AgendaItem.update(agenda_item_id, { readiness });

    return Response.json({
      status: 'ok',
      agenda_item_id,
      readiness,
      readiness_score: readinessScore,
      total_requirements: mandatory.length,
      satisfied: satisfied.length,
      missing: missing.map(m => ({ id: m.id, name: m.requirement_name, type: m.requirement_type })),
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}