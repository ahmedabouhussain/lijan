import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const CONNECTOR_ID = "6a40f423404d169cb3344836";

// GetCalendarConnection — checks if the current app user has connected their Google Calendar.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) return Response.json({ connected: false });
      const cal = await res.json();
      return Response.json({ connected: true, calendar_id: cal.id, calendar_summary: cal.summary });
    } catch {
      return Response.json({ connected: false });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}