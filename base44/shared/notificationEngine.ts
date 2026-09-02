// Notification Engine — centralized outbox pattern for LIJAN.
// Renders templates, checks preferences, dispatches via channels.
// Imported by DispatchNotification and other backend functions.

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
}

export function renderTemplate(template: string, context: Record<string, any> = {}): string {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const val = context[key];
    if (val === undefined || val === null) return '';
    return String(val);
  });
}

export async function dispatchNotification(base44: any, params: NotificationParams): Promise<{ outbox_id: string; status: string; channel: string }> {
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
  } = params;

  // 1. Resolve recipient email/name if not provided
  let email = recipient_email;
  let name = recipient_name;
  if (!email || !name) {
    try {
      const user = await base44.asServiceRole.entities.User.get(recipient_user_id);
      if (user) {
        email = email || user.email;
        name = name || user.full_name || user.email;
      }
    } catch {}
  }

  // 2. Look up template: org-specific first, then platform default
  let template = null;
  try {
    const orgTemplates = await base44.asServiceRole.entities.NotificationTemplate.filter({
      organization_id,
      event_type,
      enabled: true,
    });
    template = (orgTemplates || [])[0];
  } catch {}

  if (!template) {
    try {
      const platformTemplates = await base44.asServiceRole.entities.NotificationTemplate.filter({
        organization_id: null,
        event_type,
        enabled: true,
      });
      template = (platformTemplates || [])[0];
    } catch {}
  }

  // 3. Build fallback template if none configured
  const channel = params.channel || template?.channel || 'in_app';
  const subjectAr = template ? renderTemplate(template.subject_template_ar, context) : `${event_type}`;
  const subjectEn = template ? renderTemplate(template.subject_template_en, context) : `${event_type}`;
  const bodyAr = template ? renderTemplate(template.body_template_ar, context) : renderTemplate('{{message}}', context);
  const bodyEn = template ? renderTemplate(template.body_template_en, context) : renderTemplate('{{message}}', context);
  const deepLink = params.deep_link || (template ? renderTemplate(template.deep_link_template, context) : '');

  // 4. Check user preferences
  let suppressed = false;
  try {
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
      user_id: recipient_user_id,
    });
    const pref = (prefs || []).find((p) => p.event_type === event_type || p.event_type === null);
    if (pref) {
      if (channel === 'email' && !pref.email_enabled) suppressed = true;
      if (channel === 'in_app' && !pref.in_app_enabled) suppressed = true;
      if (channel === 'teams' && !pref.teams_enabled) suppressed = true;
      if (channel === 'push' && !pref.push_enabled) suppressed = true;
    }
  } catch {}

  // 5. Create outbox entry
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
    status: suppressed ? 'suppressed' : 'queued',
    scheduled_for: scheduled_for || null,
    correlation_id: correlation_id || null,
    actor_name: actor_name || null,
  });

  if (suppressed) {
    return { outbox_id: outboxEntry.id, status: 'suppressed', channel };
  }

  // 6. Dispatch via channel
  let sendStatus = 'sent';
  let failureReason = '';

  if (channel === 'email' && email) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: subjectAr || subjectEn,
        body: `${bodyAr || bodyEn}\n\n${deepLink ? `الرابط: ${deepLink}` : ''}`,
      });
    } catch (err) {
      sendStatus = 'failed';
      failureReason = err.message || 'Email send failed';
    }
  }
  // in_app: no external send needed — the outbox entry IS the in-app notification
  // teams: future — requires Teams connector
  // push: future — requires mobile build

  // 7. Update outbox status
  await base44.asServiceRole.entities.NotificationOutbox.update(outboxEntry.id, {
    status: sendStatus,
    sent_at: sendStatus === 'sent' ? new Date().toISOString() : null,
    failure_reason: failureReason || null,
  });

  return { outbox_id: outboxEntry.id, status: sendStatus, channel };
}

// Batch dispatch — send to multiple recipients
export async function dispatchBatch(base44: any, paramsList: NotificationParams[]): Promise<{ sent: number; failed: number; suppressed: number }> {
  let sent = 0, failed = 0, suppressed = 0;
  for (const params of paramsList) {
    try {
      const result = await dispatchNotification(base44, params);
      if (result.status === 'sent') sent++;
      else if (result.status === 'suppressed') suppressed++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { sent, failed, suppressed };
}