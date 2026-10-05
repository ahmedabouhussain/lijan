import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { dispatchNotification, aggregateNoticeState } from '../../shared/notificationEngine.ts';

// ProcessEscalation — moves an overdue action to the next authority level.
//
// Rules this function enforces:
//   • The receiving authority is resolved BEFORE anything changes. If no real person
//     can receive the escalation, the level is NOT changed and the caller gets a
//     governed `no_recipient` answer naming the role that is missing.
//   • A repeat of the same request is not a second escalation: it returns the original
//     result unchanged (idempotency key).
//   • A deliberate new escalation (new reason or a further level) moves forward; a
//     backward request never downgrades an escalation already in force.
//   • The state transition is a compare-and-set on `escalation_revision`, so two
//     concurrent requests cannot both advance the action.
//   • The notice is queued only after the transition succeeded, and is linked to the
//     action with a deep link to its escalations surface.

const ESCALATION_CHAIN = ['none', 'reminder', 'priority_reminder', 'owner_secretary', 'chair', 'escalation_authority'];

const LEVEL_LABEL = {
  reminder: { ar: 'تذكير', en: 'Reminder' },
  priority_reminder: { ar: 'تذكير أولوية', en: 'Priority Reminder' },
  owner_secretary: { ar: 'أمين السر', en: 'Owner Secretary' },
  chair: { ar: 'الرئيس', en: 'Chair' },
  escalation_authority: { ar: 'جهة التصعيد', en: 'Escalation Authority' },
};

/** The role that must exist for a level to have a real recipient. */
const LEVEL_REQUIRED_ROLE = {
  reminder: { ar: 'الجهة المالكة للإجراء', en: 'the action owner' },
  priority_reminder: { ar: 'الجهة المالكة للإجراء', en: 'the action owner' },
  owner_secretary: { ar: 'أمين سر اللجنة', en: 'the committee secretary' },
  chair: { ar: 'رئيس اللجنة', en: 'the committee chair' },
  escalation_authority: { ar: 'مالك الجهة', en: 'the organization owner' },
};

const CLOSED_STATUS = new Set(['closed', 'verified']);

const clamp = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : '');

async function shortHash(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/**
 * Resolve the real recipients of a level. An unresolvable level returns an empty
 * list — the caller turns that into a governed stop rather than a silent escalation.
 */
async function resolveRecipients(base44, { action, committee, level }) {
  const seats = async (role) => {
    const rows = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id: committee.id, role, status: 'active' })
      .catch(() => []);
    return (rows || [])
      .filter((m) => m.user_id)
      .map((m) => ({
        user_id: m.user_id,
        email: m.user_email,
        name: m.full_name || m.full_name_ar,
        role: m.role,
        entity: committee.name_en || committee.name_ar,
      }));
  };

  if (level === 'chair') return seats('chair');
  if (level === 'owner_secretary') return seats('secretary');

  if (level === 'escalation_authority') {
    const org = await base44.asServiceRole.entities.Organization
      .get(committee.organization_id)
      .catch(() => null);
    if (org?.owner_user_id) {
      return [{
        user_id: org.owner_user_id,
        email: org.owner_email,
        name: org.owner_name,
        role: 'escalation_authority',
        entity: org.name_en || org.name_ar,
      }];
    }
    return seats('chair');
  }

  // Reminder levels go to the office that owns the action; failing that, to the
  // officer who runs follow-up.
  if (action.owner_organization_id) {
    const ownerOrg = await base44.asServiceRole.entities.Organization
      .get(action.owner_organization_id)
      .catch(() => null);
    if (ownerOrg?.owner_user_id) {
      return [{
        user_id: ownerOrg.owner_user_id,
        email: ownerOrg.owner_email,
        name: ownerOrg.owner_name,
        role: 'owner',
        entity: ownerOrg.name_en || ownerOrg.name_ar,
      }];
    }
  }
  return seats('secretary');
}

function committeePath(org, committee) {
  if (!org?.slug || !committee?.slug) return '';
  return `/o/${org.slug}--${org.public_id || org.id}/c/${committee.slug}--${committee.public_id || committee.id}/escalations`;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action_id, escalation_note, escalation_level, preview } = body;

    if (!action_id) return Response.json({ error: 'action_id is required' }, { status: 400 });

    // A missing record must read as 404, not as an internal failure.
    const action = await base44.asServiceRole.entities.Action.get(action_id).catch(() => null);
    if (!action) return Response.json({ error: 'Action not found' }, { status: 404 });

    // Authority on a TRUSTED target: the committee is derived from the action record itself.
    const auth = await authorizeCommand(base44, {
      capability: 'action.admin',
      target_type: 'Action',
      target_id: action.id,
      claimed_committee_id: action.committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    if (CLOSED_STATUS.has(action.status)) {
      return Response.json(
        { status: 'action_not_open', error: 'Action is closed', message: { ar: 'الإجراء مغلق ولا يقبل التصعيد.', en: 'This action is closed and cannot be escalated.' } },
        { status: 409 },
      );
    }

    const currentLevel = Math.max(ESCALATION_CHAIN.indexOf(action.escalation_level || 'none'), 0);
    // A requested level is honoured only as a forward move: an authority may jump ahead,
    // never downgrade an escalation that is already in force.
    const requestedIndex = escalation_level ? ESCALATION_CHAIN.indexOf(escalation_level) : -1;
    const nextIndex = requestedIndex > currentLevel
      ? requestedIndex
      : Math.min(currentLevel + 1, ESCALATION_CHAIN.length - 1);
    const nextEscalation = ESCALATION_CHAIN[nextIndex];

    if (nextEscalation === ESCALATION_CHAIN[currentLevel]) {
      return Response.json(
        { status: 'already_highest', error: 'Action is already at the highest escalation level' },
        { status: 400 },
      );
    }

    const committee = await base44.asServiceRole.entities.Committee.get(action.committee_id).catch(() => null);
    const org = committee
      ? await base44.asServiceRole.entities.Organization.get(committee.organization_id).catch(() => null)
      : null;
    const recipients = committee ? await resolveRecipients(base44, { action, committee, level: nextEscalation }) : [];
    const label = LEVEL_LABEL[nextEscalation] || { ar: nextEscalation, en: nextEscalation };
    const requiredRole = LEVEL_REQUIRED_ROLE[nextEscalation] || { ar: nextEscalation, en: nextEscalation };
    const publicRecipients = recipients.map((r) => ({ name: r.name, role: r.role, entity: r.entity }));

    // Governed stop — no recipient means no silent escalation, and no state change.
    if (recipients.length === 0) {
      await base44.asServiceRole.entities.AuditEvent.create({
        organization_id: auth.organization_id, committee_id: action.committee_id,
        actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
        action: 'escalate_blocked', entity_type: 'Action', entity_id: action_id, entity_title: action.title,
        old_value: action.escalation_level || 'none', new_value: action.escalation_level || 'none',
        description: `Escalation to ${nextEscalation} blocked: no recipient for ${requiredRole.en}`,
        correlation_id: auth.correlation_id, authority_context: auth.authority_context,
      });
      return Response.json(
        {
          status: 'no_recipient',
          level_unchanged: true,
          escalation_level: action.escalation_level || 'none',
          required_role: requiredRole.en,
          message: {
            ar: `لا يوجد مستلم صالح لهذا المستوى؛ يلزم تعيين ${requiredRole.ar} أولاً. لم تتغير حالة التصعيد.`,
            en: `No valid recipient exists for this level; ${requiredRole.en} must be assigned first. The escalation state is unchanged.`,
          },
          correlation_id: auth.correlation_id,
        },
        { status: 409 },
      );
    }

    // Preview: show who receives the action before the user commits to it.
    if (preview) {
      return Response.json({
        status: 'preview',
        action_id,
        previous_escalation_level: action.escalation_level || 'none',
        new_escalation_level: nextEscalation,
        level_label: label,
        recipients: publicRecipients,
        correlation_id: auth.correlation_id,
      });
    }

    // Idempotency: the same request — same target level and same reason — is one escalation.
    const key = clamp(body.idempotency_key, 120)
      || `${action_id}:${nextEscalation}:${await shortHash(clamp(escalation_note, 400) || 'no-note')}`;

    if (action.last_escalation_key === key) {
      return Response.json({
        status: 'duplicate',
        already_applied: true,
        unchanged: true,
        action_id,
        previous_escalation_level: action.escalation_level || 'none',
        new_escalation_level: action.escalation_level || 'none',
        recipients: publicRecipients,
        notice_state: action.escalation_notice_state || 'not_required',
        retry_available: ['failed', 'partially_delivered'].includes(action.escalation_notice_state),
        correlation_id: auth.correlation_id,
      });
    }

    // Atomic transition: compare-and-set on the revision, and a per-request transition id.
    // Only the request whose transition id survives in the record actually moved the
    // action — its twin sees the other id, reports the same result and notifies nobody.
    const revision = action.escalation_revision || 0;
    const transitionId = `${key}:${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.Action.updateMany(
      { id: action_id, escalation_revision: revision },
      {
        $set: {
          escalation_level: nextEscalation,
          escalation_revision: revision + 1,
          escalation_transition_id: transitionId,
          last_escalation_key: key,
          last_escalation_at: now,
          last_escalation_correlation: auth.correlation_id,
          last_reminder_at: now,
          reminder_count: (action.reminder_count || 0) + 1,
          // Queued with the transition. It becomes delivered only when a channel confirms.
          escalation_notice_state: 'queued',
          status: action.status === 'overdue' ? 'overdue' : (nextEscalation === 'escalation_authority' ? 'blocked' : action.status),
        },
      },
    );

    const after = await base44.asServiceRole.entities.Action.get(action_id).catch(() => null);
    const iWon = after?.escalation_transition_id === transitionId;
    if (!iWon) {
      // A concurrent request with the same key already applied this very escalation.
      if (after?.last_escalation_key === key) {
        return Response.json({
          status: 'duplicate',
          already_applied: true,
          unchanged: true,
          action_id,
          previous_escalation_level: action.escalation_level || 'none',
          new_escalation_level: after.escalation_level,
          recipients: publicRecipients,
          notice_state: after.escalation_notice_state || 'not_required',
          retry_available: ['failed', 'partially_delivered'].includes(after.escalation_notice_state),
          correlation_id: auth.correlation_id,
        });
      }
      return Response.json(
        {
          status: 'conflict',
          error: 'The escalation state changed while this request was in flight',
          current_escalation_level: after?.escalation_level || null,
          message: {
            ar: 'تغيّرت حالة التصعيد أثناء الطلب؛ أعد التحميل ثم حاول مجددًا.',
            en: 'The escalation state changed while the request was in flight; reload and try again.',
          },
          correlation_id: auth.correlation_id,
        },
        { status: 409 },
      );
    }

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: action.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'escalate', entity_type: 'Action', entity_id: action_id, entity_title: action.title,
      description: `Escalation: ${action.escalation_level || 'none'} → ${nextEscalation} to ${publicRecipients.map((r) => r.name || r.role).join(', ')}${escalation_note ? ` (${escalation_note})` : ''}`,
      old_value: action.escalation_level || 'none', new_value: nextEscalation,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    // Notify the resolved authority. The transition is already committed, so a channel
    // problem never rolls it back — it is reported instead. The action's notice state
    // follows the CHANNEL's answer, never the fact that a record exists: a created record
    // is `queued`, every recipient failing is `failed`, a partial success is
    // `partially_delivered`.
    const delivery = [];
    try {
      const deepLink = committeePath(org, committee);
      for (const recipient of recipients) {
        if (recipient.user_id === auth.user.id) continue;
        const res = await dispatchNotification(base44, {
          organization_id: auth.organization_id,
          committee_id: action.committee_id,
          recipient_user_id: recipient.user_id,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          event_type: 'escalation_triggered',
          subject_ar: `تصعيد إجراء إلى ${label.ar}`,
          subject_en: `Action escalated to ${label.en}`,
          body_ar: `صُعِّد الإجراء «${action.title_ar || action.title}» إلى ${label.ar}.${escalation_note ? ` السبب: ${escalation_note}` : ''}`,
          body_en: `The action "${action.title}" was escalated to ${label.en}.${escalation_note ? ` Reason: ${escalation_note}` : ''}`,
          source_entity_type: 'Action',
          source_entity_id: action_id,
          source_title: action.title,
          priority: nextEscalation === 'escalation_authority' ? 'high' : 'normal',
          actor_name: auth.user.full_name || auth.user.email,
          deep_link: deepLink || undefined,
          correlation_id: auth.correlation_id,
          // One notice per transition and recipient — a repeat cannot create a second one.
          transition_id: transitionId,
          idempotency_key: `${transitionId}:${recipient.user_id}`,
        });
        delivery.push({
          name: recipient.name,
          role: recipient.role,
          entity: recipient.entity,
          status: res?.status || 'failed',
          failure_reason: res?.failure_reason || null,
          attempt_count: res?.attempt_count ?? 0,
          next_retry_at: res?.next_retry_at || null,
          outbox_id: res?.outbox_id || null,
        });
      }
    } catch (error) {
      delivery.push({
        name: null,
        role: nextEscalation,
        entity: null,
        status: 'failed',
        failure_reason: error?.message || 'dispatch_failed',
        attempt_count: 0,
        next_retry_at: null,
        outbox_id: null,
      });
    }

    const noticeState = aggregateNoticeState(delivery.map((d) => d.status));
    await base44.asServiceRole.entities.Action.updateMany(
      { id: action_id, escalation_transition_id: transitionId },
      { $set: { escalation_notice_state: noticeState } },
    );

    const deliveredCount = delivery.filter((d) => d.status === 'delivered').length;
    const failedDeliveries = delivery.filter((d) => d.status === 'failed');

    return Response.json({
      status: 'ok',
      action_id,
      previous_escalation_level: action.escalation_level || 'none',
      new_escalation_level: nextEscalation,
      recipients: publicRecipients,
      // Two separate facts, reported separately: the escalation moved, and the notice did
      // (or did not) reach its recipients.
      notice_state: noticeState,
      notice_transition_id: transitionId,
      delivered_count: deliveredCount,
      failed_count: failedDeliveries.length,
      delivery,
      failure_reason: failedDeliveries.find((d) => d.failure_reason)?.failure_reason || null,
      next_retry_at: failedDeliveries.find((d) => d.next_retry_at)?.next_retry_at || null,
      retry_available: failedDeliveries.length > 0,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}