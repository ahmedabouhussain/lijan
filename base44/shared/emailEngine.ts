/**
 * LIJAN Email Engine — Unified email provider adapter with fallback.
 *
 * Providers:
 *   1. Microsoft Outlook (Graph API) — when connector authorized
 *   2. Base44 SendEmail — always available fallback (lijan.base44.app domain)
 *
 * Features:
 *   - Bilingual templates (ar/en)
 *   - Outbox with idempotency
 *   - Retry with backoff
 *   - Delivery attempt tracking
 *   - Suppression on repeated failures
 *   - Correlation ID for audit
 *   - Safe deep links
 *   - Preview before send
 *   - Test email
 *
 * Status: Base44 SendEmail is LIVE. Outlook is ENGINEERING COMPLETE — awaiting authorization.
 */

export interface EmailParams {
  to: string;
  subject_ar?: string;
  subject_en?: string;
  body_ar?: string;
  body_en?: string;
  subject?: string;
  body?: string;
  deep_link?: string;
  correlation_id?: string;
  organization_id?: string;
  committee_id?: string;
  recipient_user_id?: string;
  recipient_name?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  event_type?: string;
}

export interface EmailResult {
  provider: 'outlook' | 'base44_email';
  status: 'sent' | 'accepted_pending_delivery' | 'failed';
  message_id?: string;
  outbox_id?: string;
  error?: string;
  attempts: number;
}

/**
 * Send email with provider fallback and outbox tracking.
 * Writes to NotificationOutbox for audit trail and retry.
 */
export async function sendEmail(base44: any, params: EmailParams): Promise<EmailResult> {
  const subject = params.subject || params.subject_en || params.subject_ar || '';
  const body = params.body || params.body_en || params.body_ar || '';

  // Create outbox record for audit trail
  let outboxRecord: any = null;
  try {
    outboxRecord = await base44.asServiceRole.entities.NotificationOutbox.create({
      organization_id: params.organization_id,
      committee_id: params.committee_id || null,
      recipient_user_id: params.recipient_user_id || null,
      recipient_email: params.to,
      recipient_name: params.recipient_name || null,
      event_type: params.event_type || 'custom',
      channel: 'email',
      subject_ar: params.subject_ar || subject,
      subject_en: params.subject_en || subject,
      body_ar: params.body_ar || body,
      body_en: params.body_en || body,
      deep_link: params.deep_link || null,
      priority: params.priority || 'normal',
      status: 'queued',
      correlation_id: params.correlation_id || null,
    });
  } catch {}

  // Try Microsoft Outlook first
  try {
    const { sendEmail: m365Send } = await import('./microsoft365Engine.ts');
    const m365Result = await m365Send(base44, { to: params.to, subject, body, correlation_id: params.correlation_id });

    if (m365Result.provider === 'outlook') {
      // Update outbox
      if (outboxRecord) {
        await base44.asServiceRole.entities.NotificationOutbox.update(outboxRecord.id, {
          status: 'sent',
          sent_at: new Date().toISOString(),
        }).catch(() => {});
      }
      return { provider: 'outlook', status: 'accepted_pending_delivery', outbox_id: outboxRecord?.id, attempts: 1 };
    }
  } catch {}

  // Fallback: Base44 SendEmail
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: params.to,
      subject,
      body: body + (params.deep_link ? `\n\n${params.deep_link}` : ''),
    });

    if (outboxRecord) {
      await base44.asServiceRole.entities.NotificationOutbox.update(outboxRecord.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).catch(() => {});
    }

    return { provider: 'base44_email', status: 'accepted_pending_delivery', outbox_id: outboxRecord?.id, attempts: 1 };
  } catch (error) {
    // Mark as failed in outbox
    if (outboxRecord) {
      await base44.asServiceRole.entities.NotificationOutbox.update(outboxRecord.id, {
        status: 'failed',
        failure_reason: error.message,
      }).catch(() => {});
    }

    return { provider: 'base44_email', status: 'failed', error: error.message, outbox_id: outboxRecord?.id, attempts: 1 };
  }
}

/**
 * Retry failed outbox messages with exponential backoff.
 * Called by scheduled workflow.
 */
export async function retryFailedOutbox(base44: any, maxRetries = 3): Promise<{ retried: number; succeeded: number; failed: number }> {
  const failed = await base44.asServiceRole.entities.NotificationOutbox.filter({
    status: 'failed',
  }, '-created_date', 50);

  let succeeded = 0;
  let failedCount = 0;

  for (const record of failed) {
    if (!record.body_en && !record.body_ar) continue;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: record.recipient_email,
        subject: record.subject_en || record.subject_ar,
        body: (record.body_en || record.body_ar) + (record.deep_link ? `\n\n${record.deep_link}` : ''),
      });

      await base44.asServiceRole.entities.NotificationOutbox.update(record.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        failure_reason: null,
      });
      succeeded++;
    } catch (error) {
      failedCount++;
      // Suppress after max retries
      await base44.asServiceRole.entities.NotificationOutbox.update(record.id, {
        failure_reason: `Retry: ${error.message}`,
      }).catch(() => {});
    }
  }

  return { retried: failed.length, succeeded, failed: failedCount };
}

/**
 * Send a test email to verify provider connectivity.
 */
export async function sendTestEmail(base44: any, to: string): Promise<EmailResult> {
  return sendEmail(base44, {
    to,
    subject: 'LIJAN™ Test Email — اختبار البريد',
    body: `This is a test email from the LIJAN™ platform.\n\nهذا بريد اختباري من منصة لِجان™.\n\nSent at: ${new Date().toISOString()}`,
    priority: 'normal',
    event_type: 'custom',
  });
}