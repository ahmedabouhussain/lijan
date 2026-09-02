import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getHealthStatus } from '../../shared/microsoft365Engine.ts';
import { sendTestEmail } from '../../shared/emailEngine.ts';

// GetIntegrationHealth — returns connection status for all Microsoft 365 services
// and email provider. Used by the Integration Health panel in CommitteeIntegrations.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Test email action
    if (action === 'test_email') {
      const body = await req.json().catch(() => ({}));
      const { to } = body;
      if (!to) {
        return Response.json({ error: 'Email address required' }, { status: 400 });
      }
      const result = await sendTestEmail(base44, to);
      return Response.json(result);
    }

    // Default: get health status for all M365 services
    const m365Health = await getHealthStatus(base44);

    // Email provider status
    const emailProvider = {
      primary: 'base44_email',
      primary_status: 'live',
      fallback: 'outlook',
      fallback_status: m365Health.services.find(s => s.service === 'outlook')?.status || 'not_authorized',
    };

    return Response.json({
      microsoft365: m365Health,
      email: emailProvider,
      gateway: {
        configured: false,
        status: 'not_deployed',
        note: 'LIJAN Integration Gateway contract ready — awaiting deployment for PDF/A, DOCX, large documents.',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}