import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const CONNECTOR_ID = "6abe5970bddfed2e7caa5cda";

// GetOutlookCalendarConnection — checks if the current app user has connected their Outlook calendar.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      const res = await fetch('https://graph.microsoft.com/v1.0/me/calendar', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) return Response.json({ connected: false });
      const cal = await res.json();
      return Response.json({ connected: true, calendar_id: cal.id, calendar_summary: cal.name });
    } catch {
      return Response.json({ connected: false });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}