import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';

// OpenVote — opens a voting session for a decision.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, decision_id, meeting_id, vote_method } = body;

    if (!committee_id || !decision_id) {
      return Response.json({ error: 'committee_id, decision_id are required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: the committee is derived from the decision record itself, and
    // the permitted-state gate makes a second open of an already-open vote impossible.
    const auth = await authorizeCommand(base44, {
      capability: 'vote.call',
      target_type: 'Decision',
      target_id: decision_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const decision = await base44.asServiceRole.entities.Decision.get(decision_id);
    if (!decision || decision.committee_id !== committee_id) {
      return Response.json({ error: 'Decision not found' }, { status: 404 });
    }

    if (decision.status !== 'voting' && decision.status !== 'proposed') {
      return Response.json({ error: `Cannot open vote on decision with status '${decision.status}'` }, { status: 400 });
    }

    // Eligibility freeze: get active voting members
    const members = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id, status: 'active', voting_right: true }).catch(() => []);

    // Exclude recused members
    const recusals = await base44.asServiceRole.entities.Recusal
      .filter({ committee_id, status: 'active' }).catch(() => []);
    const recusedNames = new Set((recusals || []).map(r => r.member_name));
    const eligibleVoters = (members || []).filter(m => !recusedNames.has(m.full_name));

    await base44.asServiceRole.entities.Decision.update(decision_id, { status: 'voting' });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'vote.open', entity_type: 'Decision', entity_id: decision_id,
      entity_title: decision.title,
      description: `Vote opened: ${eligibleVoters.length} eligible voters (frozen)`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    // Notify all eligible voters that voting is open
    try {
      const actorName = auth.user.full_name || auth.user.email;
      const deepLink = `/o/${auth.organization_id}/c/${committee_id}/voting`;
      const notifParams = (eligibleVoters || [])
        .filter((m) => m.user_id && m.user_id !== auth.user.id)
        .map((m) => ({
          organization_id: auth.organization_id,
          committee_id,
          recipient_user_id: m.user_id,
          recipient_name: m.full_name || m.full_name_ar || '',
          event_type: 'decision_voting_open',
          context: {
            decision_title: decision.title,
            decision_number: decision.decision_number || '',
            actor_name: actorName,
            message: `تم فتح باب التصويت على القرار: ${decision.title}`,
            deep_link: deepLink,
          },
          source_entity_type: 'Decision',
          source_entity_id: decision_id,
          source_title: decision.title,
          priority: 'urgent',
          correlation_id: auth.correlation_id,
          actor_name: actorName,
          deep_link: deepLink,
        }));
      if (notifParams.length > 0) {
        await dispatchBatch(base44, notifParams);
      }
    } catch {}

    return Response.json({
      status: 'ok', decision_id,
      eligible_voters: eligibleVoters.map(m => ({ name: m.full_name, role: m.role })),
      eligible_count: eligibleVoters.length,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}