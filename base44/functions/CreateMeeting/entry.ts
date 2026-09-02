import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';

// CreateMeeting — governed meeting creation inside a committee.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      committee_id, title, title_ar, date, location, mode, provider, meeting_url,
      quorum_required, duration_minutes,
      // Recurrence fields
      recurrence_type, recurrence_interval, recurrence_count, recurrence_until,
      recurrence_days_of_week, recurrence_month_day,
    } = body;

    if (!committee_id || !title || !date) {
      return Response.json({ error: 'committee_id, title, date are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'meeting.schedule' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    // Build RRULE if recurrence requested
    const { buildRRuleFromConfig, generateOccurrences } = await import('../../shared/rruleGenerator.ts');
    const hasRecurrence = recurrence_type && recurrence_type !== 'none';
    const rrule = hasRecurrence
      ? buildRRuleFromConfig({ recurrence_type, recurrence_interval, recurrence_count, recurrence_until, recurrence_days_of_week, recurrence_month_day })
      : null;

    const seriesId = hasRecurrence ? crypto.randomUUID() : null;

    // Create the meeting (master if recurring)
    const meeting = await base44.asServiceRole.entities.Meeting.create({
      organization_id: auth.organization_id,
      committee_id,
      title, title_ar: title_ar || null,
      date, location: location || null,
      mode: mode || 'hybrid',
      provider: provider || 'none',
      meeting_url: meeting_url || null,
      quorum_required: quorum_required || 3,
      duration_minutes: duration_minutes || 60,
      agenda_ready: false,
      status: 'scheduled',
      series_id: seriesId,
      is_series_master: hasRecurrence,
      recurrence_type: recurrence_type || 'none',
      recurrence_rrule: rrule,
      recurrence_interval: recurrence_interval || 1,
      recurrence_count: recurrence_count || null,
      recurrence_until: recurrence_until || null,
      recurrence_days_of_week: recurrence_days_of_week || null,
      recurrence_month_day: recurrence_month_day || null,
      series_instance_number: hasRecurrence ? 0 : null, // 0 = master
    });

    // Generate initial instances for recurring series (6-month horizon)
    let instancesCreated = 0;
    if (hasRecurrence && rrule) {
      const horizon = recurrence_until
        ? new Date(Math.min(new Date(recurrence_until).getTime(), Date.now() + 180 * 24 * 60 * 60 * 1000))
        : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
      const occurrences = generateOccurrences(new Date(date), rrule, horizon, 50);
      const masterDateKey = new Date(date).toISOString().slice(0, 16); // compare to minute precision
      const toCreate = [];
      let instanceNum = 1;
      for (const occ of occurrences) {
        if (occ.toISOString().slice(0, 16) === masterDateKey) continue; // skip master date
        toCreate.push({
          organization_id: auth.organization_id,
          committee_id,
          title, title_ar: title_ar || null,
          date: occ.toISOString(),
          duration_minutes: duration_minutes || 60,
          location: location || null,
          mode: mode || 'hybrid',
          provider: provider || 'none',
          meeting_url: meeting_url || null,
          quorum_required: quorum_required || 3,
          agenda_ready: false,
          status: 'scheduled',
          series_id: seriesId,
          is_series_master: false,
          parent_meeting_id: meeting.id,
          recurrence_type: 'none',
          series_instance_number: instanceNum++,
        });
      }
      if (toCreate.length > 0) {
        const created = await base44.asServiceRole.entities.Meeting.bulkCreate(toCreate);
        instancesCreated = created.length;
      }
    }

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: hasRecurrence ? 'meeting.create_recurring' : 'meeting.create',
      entity_type: 'Meeting', entity_id: meeting.id,
      entity_title: title,
      description: hasRecurrence
        ? `Recurring meeting series created (${recurrence_type}) — ${instancesCreated} instances generated`
        : `Meeting scheduled: ${date}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    // Dispatch meeting_scheduled notifications to all active committee members
    try {
      const members = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id, status: 'active' }).catch(() => []);
      const actorName = auth.user.full_name || auth.user.email;
      const deepLink = `/o/${auth.organization_id}/c/${committee_id}/meetings/${meeting.id}`;
      const notifParams = (members || [])
        .filter((m) => m.user_id && m.user_id !== auth.user.id)
        .map((m) => ({
          organization_id: auth.organization_id,
          committee_id,
          recipient_user_id: m.user_id,
          recipient_name: m.full_name || m.full_name_ar || '',
          event_type: 'meeting_scheduled',
          context: {
            meeting_title: title_ar || title,
            meeting_date: date,
            committee_name: '',
            actor_name: actorName,
            deep_link: deepLink,
          },
          source_entity_type: 'Meeting',
          source_entity_id: meeting.id,
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

    return Response.json({ status: 'ok', meeting, instances_created: instancesCreated, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}