import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const CONNECTOR_ID = "6a40f423404d169cb3344836";

// SyncMeetingToCalendar — creates or updates a Google Calendar event for a LIJAN meeting.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { meeting_id } = body;
    if (!meeting_id) return Response.json({ error: 'meeting_id is required' }, { status: 400 });

    // Get the user's Google Calendar connection
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch {
      return Response.json({ connected: false, error: 'Google Calendar not connected' }, { status: 403 });
    }

    // Load meeting
    const meeting = await base44.asServiceRole.entities.Meeting.get(meeting_id);
    if (!meeting) return Response.json({ error: 'Meeting not found' }, { status: 404 });

    // Build calendar event
    const start = new Date(meeting.date);
    const end = new Date(start.getTime() + (meeting.duration_minutes || 60) * 60000);
    const eventBody = {
      summary: meeting.title || meeting.title_ar || 'Committee Meeting',
      description: [
        meeting.title_ar || meeting.title || '',
        meeting.location ? `📍 ${meeting.location}` : '',
        meeting.meeting_url ? `🔗 ${meeting.meeting_url}` : '',
      ].filter(Boolean).join('\n'),
      location: meeting.location || meeting.meeting_url || '',
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Qatar' },
      end: { dateTime: end.toISOString(), timeZone: 'Asia/Qatar' },
    };

    // Check if already synced
    const existing = await base44.asServiceRole.entities.ExternalReference.filter({
      raqeem_entity_type: 'Meeting',
      raqeem_record_id: meeting_id,
      external_system: 'google_calendar',
    }).catch(() => []);

    let eventData;
    let action;

    if (existing && existing.length > 0) {
      // Update existing event
      const ref = existing[0];
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${ref.external_record_id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(eventBody),
        }
      );
      eventData = await res.json();
      action = 'updated';
      // Update sync timestamp
      await base44.asServiceRole.entities.ExternalReference.update(ref.id, {
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      });
    } else {
      // Create new event
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody),
      });
      eventData = await res.json();
      action = 'created';

      // Store reference
      if (eventData.id) {
        await base44.asServiceRole.entities.ExternalReference.create({
          organization_id: meeting.organization_id,
          raqeem_entity_type: 'Meeting',
          raqeem_record_id: meeting_id,
          external_system: 'google_calendar',
          external_record_id: eventData.id,
          external_record_type: 'calendar_event',
          external_url: eventData.htmlLink,
          mapping_type: 'created_in',
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
        });
      }
    }

    return Response.json({
      connected: true,
      event_id: eventData.id,
      event_url: eventData.htmlLink,
      status: action,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}