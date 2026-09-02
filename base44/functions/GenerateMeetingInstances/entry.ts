import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';
import { generateOccurrences, parseRRule } from '../../shared/rruleGenerator.ts';

// GenerateMeetingInstances — expands a recurring series master into concrete
// meeting instances up to a horizon date. Idempotent: skips dates that already
// have an instance (matched by series_id + date).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { series_master_id, horizon_date } = body;

    if (!series_master_id) {
      return Response.json({ error: 'series_master_id is required' }, { status: 400 });
    }

    const master = await base44.asServiceRole.entities.Meeting.get(series_master_id);
    if (!master.is_series_master || !master.recurrence_rrule) {
      return Response.json({ error: 'Meeting is not a series master' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, {
      committee_id: master.committee_id,
      capability: 'meeting.schedule',
    });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const horizon = horizon_date ? new Date(horizon_date) : defaultHorizon();
    const occurrences = generateOccurrences(new Date(master.date), master.recurrence_rrule, horizon, 100);

    // Fetch existing instances for this series to avoid duplicates
    const existing = await base44.asServiceRole.entities.Meeting.filter({
      series_id: master.series_id,
    }, '-date', 200);

    const existingDates = new Set(
      existing
        .filter(m => !m.is_series_master)
        .map(m => normalizeDate(m.date))
    );

    const toCreate = [];
    let instanceNum = 1;
    for (const occ of occurrences) {
      const dateKey = normalizeDate(occ.toISOString());
      if (existingDates.has(dateKey)) continue;
      toCreate.push({
        organization_id: master.organization_id,
        committee_id: master.committee_id,
        title: master.title,
        title_ar: master.title_ar || null,
        date: occ.toISOString(),
        duration_minutes: master.duration_minutes || 60,
        location: master.location || null,
        mode: master.mode || 'hybrid',
        provider: master.provider || 'none',
        meeting_url: master.meeting_url || null,
        quorum_required: master.quorum_required || 3,
        agenda_ready: false,
        status: 'scheduled',
        series_id: master.series_id,
        is_series_master: false,
        parent_meeting_id: master.id,
        recurrence_type: 'none',
        series_instance_number: instanceNum++,
      });
    }

    let created = [];
    if (toCreate.length > 0) {
      created = await base44.asServiceRole.entities.Meeting.bulkCreate(toCreate);
    }

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id,
      committee_id: master.committee_id,
      actor_user_id: auth.user.id,
      actor_name: auth.user.full_name || auth.user.email,
      actor_email: auth.user.email,
      action: 'meeting.generate_instances',
      entity_type: 'Meeting',
      entity_id: master.id,
      entity_title: master.title,
      description: `Generated ${toCreate.length} instances until ${horizon.toISOString().slice(0, 10)}`,
      correlation_id: auth.correlation_id,
      authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      generated: toCreate.length,
      skipped: occurrences.length - toCreate.length,
      instances: created,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function defaultHorizon(): Date {
  const h = new Date();
  h.setMonth(h.getMonth() + 6); // generate 6 months ahead by default
  return h;
}

function normalizeDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}