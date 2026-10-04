// Notification Engine — LIJAN™ governed delivery.
//
// ONE vocabulary for delivery truth, shared by every caller:
//
//   queued → dispatching → delivered | failed | retry_scheduled
//   not_required     the recipient opted out, or no notice is needed at all
//
// Two rules this module exists to enforce:
//   • A notice is NEVER "delivered" because a record was written. State advances only on
//     evidence returned by a channel, and anything the platform cannot send is `failed`
//     with its reason — never a silent success.
//   • Every notice carries the idempotency key of what caused it, so a repeat of the same
//     request finds the existing row instead of creating a second notice.

export const NOTICE_STATES = [
  'not_required',
  'no_recipient',
  'queued',
  'dispatching',
  'delivered',
  'partially_delivered',
  'failed',
  'retry_scheduled',
] as const;

const RETRY_BASE_MINUTES = 5;
const RETRY_MAX_MINUTES = 60;

export interface NotificationParams {
  organization_id: string;
  committee_id?: string;
  recipient_user_id: string;
  recipient_email?: string;
  recipient_name?: string;
  event_type: string;
  channel?: string; // override; otherwise from template
  context?: Record<string, any>; // template variables
  source_entity_type?: string;
  source_entity_id?: string;
  source_title?: string;
  priority?: string;
  scheduled_for?: string;
  correlation_id?: string;
  actor_name?: string;
  deep_link?: string; // override; otherwise from template
  // The state transition this notice belongs to, and the key that makes the notice
  // idempotent. Both are supplied by the caller that owns the transition.
  transition_id?: string;
  idempotency_key?: string;
  // Explicit bilingual content overrides — used when the caller composes the notice itself
  // (e.g. an AI-authored brief) instead of relying on a stored template. Both languages are
  // always supplied together so no surface ever falls back across languages.
  subject_ar?: string;
  subject_en?: string;
  body_ar?: string;
  body_en?: string;
}

export interface DeliveryOutcome {
  outbox_id: string;
  status: string;
  channel: string;
  attempt_count: number;
  failure_reason: string | null;
  next_retry_at: string | null;
}

export function renderTemplate(template: string, context: Record<string, any> = {}): string {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const val = context[key];
    if (val === undefined || val === null) return '';
    return String(val);
  });
}

/** Backoff for the next delivery attempt: 5, 10, 20, 40, capped at 60 minutes. */
export function nextRetryAt(attempts: number): string {
  const minutes = Math.min(RETRY_BASE_MINUTES * Math.pow(2, Math.max(attempts - 1, 0)), RETRY_MAX_MINUTES);
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/**
 * The notice state of a whole escalation, derived from per-recipient delivery — never from
 * the fact that rows exist. All failed is `failed`; mixed is `partially_delivered`.
 */
export function aggregateNoticeState(statuses: string[]): string {
  const list = (statuses || []).filter(Boolean);
  if (list.length === 0) return 'not_required';
  const delivered = list.filter((s) => s === 'delivered').length;
  const failed = list.filter((s) => s === 'failed').length;
  const pending = list.filter((s) => ['queued', 'dispatching', 'retry_scheduled'].includes(s)).length;
  if (failed === 0 && pending === 0) return delivered > 0 ? 'delivered' : 'not_required';
  if (delivered > 0) return 'partially_delivered';
  if (failed > 0) return pending > 0 ? 'retry_scheduled' : 'failed';
  return 'retry_scheduled';
}

/**
 * Perform the real delivery for an existing outbox row. State is written only from what the
 * channel actually answered, and the attempt is counted on the row itself so a retry is
 * recorded rather than hidden.
 */
export async function attemptOutboxDelivery(base44: any, record: any): Promise<DeliveryOutcome> {
  const attempt = (record.attempt_count || 0) + 1;
  const channel = record.channel || 'in_app';
  const now = new Date().toISOString();

  await base44.asServiceRole.entities.NotificationOutbox.update(record.id, {
    status: 'dispatching',
    attempt_count: attempt,
    last_attempt_at: now,
  });

  let status = 'failed';
  let failureReason: string | null = null;
  let sentAt: string | null = null;

  try {
    if (channel === 'in_app') {
      // The outbox row IS the in-app notification: it is delivered the moment it exists.
      status = 'delivered';
      sentAt = now;
    } else if (channel === 'email') {
      if (!record.recipient_email) {
        // No address means nothing was sent — a failed delivery, never a silent success.
        failureReason = 'no_recipient_address';
      } else {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: record.recipient_email,
          subject: record.subject_ar || record.subject_en,
          body: `${record.body_ar || record.body_en || ''}${record.deep_link ? `\n\n${record.deep_link}` : ''}`,
        });
        status = 'delivered';
        sentAt = now;
      }
    } else {
      // teams / push have no provider wired yet: not delivering is the truth.
      failureReason = `channel_not_configured:${channel}`;
    }
  } catch (error: any) {
    failureReason = error?.message || 'delivery_failed';
  }

  const nextRetry = status === 'failed' ? nextRetryAt(attempt) : null;
  await base44.asServiceRole.entities.NotificationOutbox.update(record.id, {
    status,
    sent_at: sentAt,
    failure_reason: failureReason,
    next_retry_at: nextRetry,
  });

  return {
    outbox_id: record.id,
    status,
    channel,
    attempt_count: attempt,
    failure_reason: failureReason,
    next_retry_at: nextRetry,
  };
}

export async function dispatchNotification(base44: any, params: NotificationParams): Promise<DeliveryOutcome> {
  const {
    organization_id,
    committee_id,
    recipient_user_id,
    recipient_email,
    recipient_name,
    event_type,
    context = {},
    source_entity_type,
    source_entity_id,
    source_title,
    priority = 'normal',
    scheduled_for,
    correlation_id,
    actor_name,
    transition_id,
    idempotency_key,
  } = params;

  // 1. A repeat of the same notice is not a second notice: the existing row is returned.
  if (idempotency_key) {
    try {
      const existing = await base44.asServiceRole.entities.NotificationOutbox
        .filter({ idempotency_key }, { limit: 1 });
      const row = (existing?.items || existing || [])[0];
      if (row) {
        return {
          outbox_id: row.id,
          status: row.status,
          channel: row.channel,
          attempt_count: row.attempt_count || 0,
          failure_reason: row.failure_reason || null,
          next_retry_at: row.next_retry_at || null,
        };
      }
    } catch { /* no existing notice */ }
  }

  // 2. Resolve recipient email/name if not provided
  let email = recipient_email;
  let name = recipient_name;
  if (!email || !name) {
    try {
      const user = await base44.asServiceRole.entities.User.get(recipient_user_id);
      if (user) {
        email = email || user.email;
        name = name || user.full_name || user.email;
      }
    } catch { /* recipient has no account: the delivery outcome will say so */ }
  }

  // 3. Look up template: org-specific first, then platform default
  let template: any = null;
  try {
    const orgTemplates = await base44.asServiceRole.entities.NotificationTemplate.filter({
      organization_id,
      event_type,
      enabled: true,
    });
    template = (orgTemplates || [])[0];
  } catch { /* no org template */ }

  if (!template) {
    try {
      const platformTemplates = await base44.asServiceRole.entities.NotificationTemplate.filter({
        organization_id: null,
        event_type,
        enabled: true,
      });
      template = (platformTemplates || [])[0];
    } catch { /* no platform template */ }
  }

  // 4. Compose the notice (explicit content wins, then the template, then the message)
  const channel = params.channel || template?.channel || 'in_app';
  const subjectAr = params.subject_ar || (template ? renderTemplate(template.subject_template_ar, context) : `${event_type}`);
  const subjectEn = params.subject_en || (template ? renderTemplate(template.subject_template_en, context) : `${event_type}`);
  const bodyAr = params.body_ar || (template ? renderTemplate(template.body_template_ar, context) : renderTemplate('{{message}}', context));
  const bodyEn = params.body_en || (template ? renderTemplate(template.body_template_en, context) : renderTemplate('{{message}}', context));
  const deepLink = params.deep_link || (template ? renderTemplate(template.deep_link_template, context) : '');

  // 5. Check user preferences — an opted-out channel needs no notice at all
  let suppressed = false;
  try {
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
      user_id: recipient_user_id,
    });
    const pref = (prefs || []).find((p: any) => p.event_type === event_type || p.event_type === null);
    if (pref) {
      if (channel === 'email' && !pref.email_enabled) suppressed = true;
      if (channel === 'in_app' && !pref.in_app_enabled) suppressed = true;
      if (channel === 'teams' && !pref.teams_enabled) suppressed = true;
      if (channel === 'push' && !pref.push_enabled) suppressed = true;
    }
  } catch { /* no preferences recorded */ }

  // 6. Create the outbox row — `queued` means queued, and nothing more
  const outboxEntry = await base44.asServiceRole.entities.NotificationOutbox.create({
    organization_id,
    committee_id: committee_id || null,
    recipient_user_id,
    recipient_email: email || '',
    recipient_name: name || '',
    event_type,
    channel,
    subject_ar: subjectAr,
    subject_en: subjectEn,
    body_ar: bodyAr,
    body_en: bodyEn,
    deep_link: deepLink,
    source_entity_type: source_entity_type || null,
    source_entity_id: source_entity_id || null,
    source_title: source_title || null,
    priority: template?.priority || priority,
    status: suppressed ? 'not_required' : 'queued',
    scheduled_for: scheduled_for || null,
    correlation_id: correlation_id || null,
    actor_name: actor_name || null,
    transition_id: transition_id || null,
    idempotency_key: idempotency_key || null,
    attempt_count: 0,
    failure_reason: suppressed ? 'recipient_preference' : null,
  });

  if (suppressed) {
    return {
      outbox_id: outboxEntry.id,
      status: 'not_required',
      channel,
      attempt_count: 0,
      failure_reason: 'recipient_preference',
      next_retry_at: null,
    };
  }

  // 7. A notice scheduled for later stays queued for later — it is not delivered yet.
  if (scheduled_for && new Date(scheduled_for).getTime() > Date.now()) {
    await base44.asServiceRole.entities.NotificationOutbox.update(outboxEntry.id, {
      status: 'retry_scheduled',
      next_retry_at: scheduled_for,
    });
    return {
      outbox_id: outboxEntry.id,
      status: 'retry_scheduled',
      channel,
      attempt_count: 0,
      failure_reason: null,
      next_retry_at: scheduled_for,
    };
  }

  // 8. Attempt the real delivery and report what the channel answered.
  return attemptOutboxDelivery(base44, { ...outboxEntry, channel });
}

// Batch dispatch — send to multiple recipients, reporting each outcome apart
export async function dispatchBatch(base44: any, paramsList: NotificationParams[]): Promise<{ delivered: number; failed: number; not_required: number }> {
  let delivered = 0, failed = 0, notRequired = 0;
  for (const params of paramsList) {
    try {
      const result = await dispatchNotification(base44, params);
      if (result.status === 'delivered') delivered++;
      else if (result.status === 'not_required') notRequired++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { delivered, failed, not_required: notRequired };
}