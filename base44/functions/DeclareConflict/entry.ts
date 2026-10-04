import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// DeclareConflict — records a conflict of interest declaration.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, conflict_type, description, related_entity, agenda_item_id, decision_id } = body;

    if (!committee_id || !conflict_type || !description) {
      return Response.json({ error: 'committee_id, conflict_type, description are required' }, { status: 400 });
    }

    // The committee itself is the trusted target of a self-declaration: only a person holding a seat
    // in it may declare a conflict, and the seat is resolved server-side.
    const auth = await authorizeCommand(base44, {
      capability: 'conflict.declare',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const declaration = await base44.asServiceRole.entities.ConflictDeclaration.create({
      organization_id: auth.organization_id,
      committee_id: auth.trusted_target.derived_committee_id,
      member_id: auth.membership?.id || null,
      membership_id: auth.membership?.id || null,
      member_user_id: auth.user.id,
      member_name: auth.user.full_name || auth.user.email,
      conflict_type,
      description,
      related_entity: related_entity || null,
      agenda_item_id: agenda_item_id || null,
      decision_id: decision_id || null,
      declared_at: new Date().toISOString(),
      status: 'declared',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'conflict.declare', entity_type: 'ConflictDeclaration', entity_id: declaration.id,
      description: `Conflict declared: ${conflict_type}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', declaration, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}