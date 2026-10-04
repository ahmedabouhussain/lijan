import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';

// PublishMeetingPack — publishes a frozen, versioned meeting pack.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, meeting_id, title, title_ar, description, document_ids, agenda_item_ids } = body;

    if (!committee_id || !meeting_id || !title) {
      return Response.json({ error: 'committee_id, meeting_id, title are required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: each published pack version is anchored to the committee record.
    const auth = await authorizeCommand(base44, {
      capability: 'agenda.edit',
      target_type: 'Committee',
      target_id: committee_id,
      mode: 'create',
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    // Get current max version
    const packs = await base44.asServiceRole.entities.MeetingPack
      .filter({ committee_id, meeting_id }).catch(() => []);
    const versionNumber = Math.max(0, ...(packs || []).map(p => p.version_number || 0)) + 1;

    // Supersede previous published packs
    const prevPublished = (packs || []).filter(p => p.status === 'published');
    for (const p of prevPublished) {
      await base44.asServiceRole.entities.MeetingPack.update(p.id, {
        status: 'superseded', superseded_by_version: versionNumber, superseded_at: new Date().toISOString(),
      });
    }

    const pack = await base44.asServiceRole.entities.MeetingPack.create({
      organization_id: auth.organization_id, committee_id, meeting_id,
      pack_number: `MP-${Date.now().toString(36)}`,
      version_number: versionNumber,
      title, title_ar: title_ar || null, description: description || null,
      document_ids: JSON.stringify(document_ids || []),
      agenda_item_ids: JSON.stringify(agenda_item_ids || []),
      content_hash: `sha256:${Date.now()}`,
      published_by_name: auth.user.full_name || auth.user.email,
      published_by_user_id: auth.user.id,
      published_at: new Date().toISOString(),
      acknowledged_by: JSON.stringify([]),
      status: 'published',
    });

    // Mark meeting agenda as ready
    await base44.asServiceRole.entities.Meeting.update(meeting_id, { agenda_ready: true });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'pack.publish', entity_type: 'MeetingPack', entity_id: pack.id,
      entity_title: title, description: `Pack v${versionNumber} published (frozen)`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    // Notify all committee members that a pack has been published
    try {
      const members = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id, status: 'active' }).catch(() => []);
      const actorName = auth.user.full_name || auth.user.email;
      const deepLink = `/o/${auth.organization_id}/c/${committee_id}/packs`;
      const notifParams = (members || [])
        .filter((m) => m.user_id && m.user_id !== auth.user.id)
        .map((m) => ({
          organization_id: auth.organization_id,
          committee_id,
          recipient_user_id: m.user_id,
          recipient_name: m.full_name || m.full_name_ar || '',
          event_type: 'pack_published',
          context: {
            pack_title: title_ar || title,
            version: versionNumber,
            actor_name: actorName,
            message: `تم نشر حزمة الاجتماع (الإصدار ${versionNumber})`,
            deep_link: deepLink,
          },
          source_entity_type: 'MeetingPack',
          source_entity_id: pack.id,
          source_title: title,
          priority: 'high',
          correlation_id: auth.correlation_id,
          actor_name: actorName,
          deep_link: deepLink,
        }));
      if (notifParams.length > 0) {
        await dispatchBatch(base44, notifParams);
      }
    } catch {}

    return Response.json({ status: 'ok', pack, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}