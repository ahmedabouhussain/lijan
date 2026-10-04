import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// InviteCommitteeMember — governed member invitation.
// Verifies: auth, org membership, committee management capability, committee scope.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, full_name, full_name_ar, email, role, authority_level, institution_name, term_start, term_end, protocol_order } = body;

    if (!committee_id || !full_name || !role) {
      return Response.json({ error: 'committee_id, full_name, role are required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: the new seat is anchored to the committee RECORD.
    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committee_id,
      mode: 'create',
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const membership = await base44.asServiceRole.entities.CommitteeMembership.create({
      organization_id: auth.organization_id,
      committee_id,
      full_name,
      full_name_ar: full_name_ar || null,
      user_email: email || null,
      role,
      authority_level: authority_level || 'decision',
      voting_right: !['observer', 'advisor'].includes(role),
      status: 'active',
      institution_name: institution_name || null,
      term_start: term_start || null,
      term_end: term_end || null,
      protocol_order: protocol_order || 99,
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'member.invite', entity_type: 'CommitteeMembership', entity_id: membership.id,
      entity_title: full_name, description: `Invited ${full_name} as ${role}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', membership, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}