import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { dispatchNotification } from '../../shared/notificationEngine.ts';
import {
  OPEN_ACTION_STATUSES,
  classifyAction,
  earnedEscalationLevel,
  nextEscalationLevel,
  shouldRemind,
  resolveRecipients,
  buildReminderMessage,
  todayISO,
  addDaysISO,
} from '../../shared/executionReminderEngine.ts';

// RunExecutionReminders — the automatic deadline follow-up cycle.
// Called by the daily scheduled workflow "Ameen Execution Reminders" (and available for an admin
// to run on demand). It raises reminders for actions whose final delivery deadline is approaching,
// due today or already exceeded; advances the follow-up level of overdue actions by the level they
// have EARNED from their own date; and writes an audit event for every notice raised.
//
// Recipients come from STORED seat links only — the owning work group's seats, then the
// committee's accountable offices. The responsible party named on the action is always stated in
// the notice text; an owner with no seat and no account is never invented, and is reported back as
// unrouted so the gap is visible instead of silent.

const SYSTEM_ACTOR = 'نظام متابعة التنفيذ الآلي — أمين';
const MAX_ACTIONS_PER_RUN = 250;
const MAX_EMAILS_PER_RUN = 40;

function indexById(records) {
  const map = {};
  for (const record of records || []) map[record.id] = record;
  return map;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // No user context when the scheduled workflow runs this; a signed-in caller must be a platform admin.
    try {
      const me = await base44.auth.me();
      if (me && me.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    } catch { /* scheduled run without a user context */ }

    const body = await req.json().catch(() => ({}));
    const windowDays = Math.min(Math.max(Number(body.window_days) || 7, 1), 30);
    const dryRun = body.dry_run === true;
    const scopeOrg = body.organization_id || null;

    const now = new Date();
    const today = todayISO(now);
    const windowEnd = addDaysISO(today, windowDays);
    // The once-per-day guard is the normal rule; an admin re-run may force the cycle.
    const force = body.force === true;

    const query = { status: { $in: OPEN_ACTION_STATUSES }, deadline: { $exists: true, $lte: windowEnd } };
    if (scopeOrg) query.organization_id = scopeOrg;

    const candidates = await base44.asServiceRole.entities.Action.filter(query, 'deadline', 500).catch(() => []);

    const due = [];
    for (const action of candidates || []) {
      const classification = classifyAction(action, { today, windowDays });
      if (!classification) continue;
      if (!force && !shouldRemind(action.last_reminder_at, now)) continue;
      due.push({
        action,
        stage: classification.stage,
        days: classification.days,
        event_type: classification.event_type,
        priority: classification.priority,
      });
    }

    if (due.length === 0) {
      return Response.json({
        status: 'ok', today, window_days: windowDays,
        scanned: (candidates || []).length, due: 0, dispatched: 0,
      });
    }

    const targets = due.slice(0, MAX_ACTIONS_PER_RUN);
    const skippedByCap = due.length - targets.length;

    const committeeIds = [...new Set(targets.map((t) => t.action.committee_id).filter(Boolean))];

    const [committees, officeSeats, workstreamSeats] = await Promise.all([
      committeeIds.length ? base44.asServiceRole.entities.Committee.filter({ id: { $in: committeeIds } }, '-created_date', 200).catch(() => []) : [],
      committeeIds.length ? base44.asServiceRole.entities.CommitteeMembership.filter({ committee_id: { $in: committeeIds }, status: 'active' }, 'protocol_order', 500).catch(() => []) : [],
      committeeIds.length ? base44.asServiceRole.entities.WorkstreamMembership.filter({ committee_id: { $in: committeeIds }, status: 'active' }, 'created_date', 500).catch(() => []) : [],
    ]);

    const orgIds = [...new Set((committees || []).map((c) => c.organization_id).filter(Boolean))];
    const orgs = orgIds.length
      ? await base44.asServiceRole.entities.Organization.filter({ id: { $in: orgIds } }, '-created_date', 100).catch(() => [])
      : [];

    const committeeIndex = indexById(committees);
    const orgIndex = indexById(orgs);

    let dispatched = 0, emailsSent = 0, unrouted = 0, escalations = 0, markedOverdue = 0;
    const notices = [];

    for (const target of targets) {
      const { action, stage, days, event_type, priority } = target;
      const committee = committeeIndex[action.committee_id] || null;
      const org = orgIndex[committee?.organization_id || action.organization_id] || null;
      const committeeName = committee ? (committee.name_ar || committee.name_en || '') : '';

      const recipients = resolveRecipients({
        workstreamSeats: (workstreamSeats || []).filter((s) => s.workstream_id && s.workstream_id === action.workstream_id),
        committeeSeats: (officeSeats || []).filter((s) => s.committee_id === action.committee_id),
      });

      const earned = stage === 'overdue' ? earnedEscalationLevel(days) : 'none';
      const followedUpTo = stage === 'overdue' ? nextEscalationLevel(action.escalation_level, earned) : (action.escalation_level || 'none');
      const levelAdvanced = followedUpTo !== (action.escalation_level || 'none');
      const becomesOverdue = stage === 'overdue' && action.status !== 'overdue';

      const orgRef = org ? (org.slug ? `${org.slug}--${org.public_id}` : org.public_id) : null;
      const committeeRef = committee ? `${committee.slug || committee.id}--${committee.public_id || committee.id}` : null;
      const deepLink = orgRef && committeeRef ? `/o/${orgRef}/c/${committeeRef}/actions` : '';

      if (recipients.length === 0) unrouted += 1;

      if (!dryRun) {
        for (const recipient of recipients) {
          const message = buildReminderMessage({
            action, stage, days, committee_name: committeeName,
            recipient_name: recipient.name,
            escalation_label: levelAdvanced ? followedUpTo : null,
          });

          await dispatchNotification(base44, {
            organization_id: action.organization_id,
            committee_id: action.committee_id || null,
            recipient_user_id: recipient.user_id,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            event_type,
            channel: 'in_app',
            priority,
            subject_ar: message.subject_ar,
            subject_en: message.subject_en,
            body_ar: message.body_ar,
            body_en: message.body_en,
            source_entity_type: 'Action',
            source_entity_id: action.id,
            source_title: action.title_ar || action.title || null,
            deep_link: deepLink,
            correlation_id: `reminder_${today}_${action.id}`,
            actor_name: SYSTEM_ACTOR,
          }).catch(() => null);
          dispatched += 1;

          // Email is reserved for genuinely late delivery and goes to the accountable offices only,
          // so the mail channel stays meaningful instead of becoming a daily broadcast.
          if (stage === 'overdue' && recipient.seat_kind === 'committee_office' && recipient.email && emailsSent < MAX_EMAILS_PER_RUN) {
            await dispatchNotification(base44, {
              organization_id: action.organization_id,
              committee_id: action.committee_id || null,
              recipient_user_id: recipient.user_id,
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              event_type: 'action_overdue',
              channel: 'email',
              priority: 'urgent',
              subject_ar: message.subject_ar,
              subject_en: message.subject_en,
              body_ar: message.body_ar,
              body_en: message.body_en,
              source_entity_type: 'Action',
              source_entity_id: action.id,
              source_title: action.title_ar || action.title || null,
              deep_link: deepLink,
              correlation_id: `reminder_email_${today}_${action.id}`,
              actor_name: SYSTEM_ACTOR,
            }).catch(() => null);
            emailsSent += 1;
          }
        }

        await base44.asServiceRole.entities.Action.update(action.id, {
          last_reminder_at: now.toISOString(),
          reminder_count: (action.reminder_count || 0) + 1,
          escalation_level: followedUpTo,
          ...(becomesOverdue ? { status: 'overdue' } : {}),
        }).catch(() => null);

        await base44.asServiceRole.entities.AuditEvent.create({
          organization_id: action.organization_id,
          committee_id: action.committee_id || null,
          actor_name: SYSTEM_ACTOR,
          action: levelAdvanced || becomesOverdue ? 'escalate' : 'update',
          entity_type: 'Action',
          entity_id: action.id,
          entity_title: action.title_ar || action.title || null,
          description: `تنبيه آلي (${stage}، ${days} يوم): أُرسل إلى ${recipients.length} مسؤولًا${recipients.length === 0 ? ' — لا يشغل أحد المسؤولين مقعدًا بحساب مستخدم' : ''}`,
          old_value: `${action.status || 'assigned'} / ${action.escalation_level || 'none'}`,
          new_value: `${becomesOverdue ? 'overdue' : (action.status || 'assigned')} / ${followedUpTo}`,
          correlation_id: `reminder_${today}_${action.id}`,
        }).catch(() => null);
      }

      if (levelAdvanced) escalations += 1;
      if (becomesOverdue) markedOverdue += 1;

      notices.push({
        action_id: action.id,
        title: action.title_ar || action.title || '',
        stage,
        days_remaining: days,
        recipients: recipients.length,
        recipient_names: recipients.map((r) => r.name),
        escalation_level: followedUpTo,
        deep_link: deepLink,
      });
    }

    return Response.json({
      status: 'ok',
      today,
      window_days: windowDays,
      dry_run: dryRun,
      forced: force,
      scanned: (candidates || []).length,
      due: due.length,
      processed: targets.length,
      skipped_by_cap: skippedByCap,
      notices_created: dispatched,
      emails_sent: emailsSent,
      overdue_marked: markedOverdue,
      escalations_advanced: escalations,
      unrouted_actions: unrouted,
      notices: notices.slice(0, 40),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}