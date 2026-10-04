import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';
import { dispatchNotification } from '../../shared/notificationEngine.ts';

// ProcessEscalation — escalates an overdue action to the next authority level.
const ESCALATION_CHAIN = ['none', 'reminder', 'priority_reminder', 'owner_secretary', 'chair', 'escalation_authority'];

const LEVEL_LABEL = {
  reminder: { ar: 'تذكير', en: 'Reminder' },
  priority_reminder: { ar: 'تذكير أولوية', en: 'Priority Reminder' },
  owner_secretary: { ar: 'أمين السر', en: 'Owner Secretary' },
  chair: { ar: 'الرئيس', en: 'Chair' },
  escalation_authority: { ar: 'جهة التصعيد', en: 'Escalation Authority' },
};

// The authority that now owns the escalated action — the recipients of the notice.
async function recipientsFor(base44, committee, level) {
  if (level === 'chair' || level === 'owner_secretary') {
    const role = level === 'chair' ? 'chair' : 'secretary';
    const members = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id: committee.id, role, status: 'active' })
      .catch(() => []);
    return (members || [])
      .filter((m) => m.user_id)
      .map((m) => ({ user_id: m.user_id, email: m.user_email, name: m.full_name || m.full_name_ar }));
  }
  if (level === 'escalation_authority') {
    const org = await base44.asServiceRole.entities.Organization
      .get(committee.organization_id)
      .catch(() => null);
    if (!org?.owner_user_id) return [];
    return [{ user_id: org.owner_user_id, email: org.owner_email, name: org.owner_name }];
  }
  return [];
}

function committeePath(org, committee) {
  if (!org?.slug || !committee?.slug) return '';
  return `/o/${org.slug}--${org.public_id || org.id}/c/${committee.slug}--${committee.public_id || committee.id}/escalations`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action_id, escalation_note, escalation_level } = body;

    if (!action_id) return Response.json({ error: 'action_id is required' }, { status: 400 });

    // A missing record must read as 404, not as an internal failure.
    const action = await base44.asServiceRole.entities.Action.get(action_id).catch(() => null);
    if (!action) return Response.json({ error: 'Action not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: action.committee_id, capability: 'action.admin' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const currentLevel = Math.max(ESCALATION_CHAIN.indexOf(action.escalation_level || 'none'), 0);
    // A requested level is honoured only as a forward move: an authority may jump ahead,
    // never downgrade an escalation that is already in force.
    const requestedIndex = escalation_level ? ESCALATION_CHAIN.indexOf(escalation_level) : -1;
    const nextIndex = requestedIndex > currentLevel
      ? requestedIndex
      : Math.min(currentLevel + 1, ESCALATION_CHAIN.length - 1);
    const nextEscalation = ESCALATION_CHAIN[nextIndex];

    if (nextEscalation === ESCALATION_CHAIN[currentLevel]) {
      return Response.json({ error: 'Action is already at the highest escalation level' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Action.update(action_id, {
      escalation_level: nextEscalation,
      last_reminder_at: new Date().toISOString(),
      reminder_count: (action.reminder_count || 0) + 1,
      status: action.status === 'overdue' ? 'overdue' : (nextEscalation === 'escalation_authority' ? 'blocked' : action.status),
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: action.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'escalate', entity_type: 'Action', entity_id: action_id,
      entity_title: action.title,
      description: `Escalation: ${action.escalation_level || 'none'} → ${nextEscalation}${escalation_note ? ` (${escalation_note})` : ''}`,
      old_value: action.escalation_level || 'none', new_value: nextEscalation,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    // Notify the authority that now owns the action. A notice that cannot be queued must
    // never undo a completed escalation, so the outcome is reported rather than thrown.
    let notified = 0;
    try {
      const committee = await base44.asServiceRole.entities.Committee.get(action.committee_id).catch(() => null);
      if (committee) {
        const org = await base44.asServiceRole.entities.Organization
          .get(committee.organization_id)
          .catch(() => null);
        const label = LEVEL_LABEL[nextEscalation] || { ar: nextEscalation, en: nextEscalation };
        const deepLink = committeePath(org, committee);
        const recipients = await recipientsFor(base44, committee, nextEscalation);
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
          });
          if (res?.outbox_id) notified += 1;
        }
      }
    } catch (error) {
      console.error('Escalation notice failed:', error?.message || error);
    }

    return Response.json({
      status: 'ok',
      action_id,
      previous_escalation_level: action.escalation_level || 'none',
      new_escalation_level: nextEscalation,
      notified,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}