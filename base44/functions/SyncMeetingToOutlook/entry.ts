import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const CONNECTOR_ID = "6abe5970bddfed2e7caa5cda";
const GRAPH = 'https://graph.microsoft.com/v1.0';

// Many Graph writes answer 202/204 with an empty body — never call res.json() directly.
async function graphRequest(accessToken, path, options = {}) {
  const res = await fetch(`${GRAPH}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

// SyncMeetingToOutlook — creates or updates the Outlook calendar event for a LIJAN meeting,
// in the calendar of the member who requested the sync.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { meeting_id } = body;
    if (!meeting_id) return Response.json({ error: 'meeting_id is required' }, { status: 400 });

    // The member's own Outlook connection
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch {
      return Response.json({ connected: false, error: 'Outlook calendar not connected' }, { status: 403 });
    }

    const meeting = await base44.asServiceRole.entities.Meeting.get(meeting_id);
    if (!meeting) return Response.json({ error: 'Meeting not found' }, { status: 404 });

    const start = new Date(meeting.date);
    const end = new Date(start.getTime() + (meeting.duration_minutes || 60) * 60000);

    const eventBody = {
      subject: meeting.title || meeting.title_ar || 'Committee Meeting',
      body: {
        contentType: 'text',
        content: [
          meeting.title_ar || meeting.title || '',
          meeting.location ? `الموقع: ${meeting.location}` : '',
          meeting.meeting_url ? `رابط الاجتماع: ${meeting.meeting_url}` : '',
        ].filter(Boolean).join('\n'),
      },
      start: { dateTime: start.toISOString(), timeZone: 'UTC' },
      end: { dateTime: end.toISOString(), timeZone: 'UTC' },
      showAs: 'busy',
    };
    const location = meeting.location || meeting.meeting_url;
    if (location) eventBody.location = { displayName: location };

    // Each member maps the meeting to an event in their own calendar.
    const existing = await base44.asServiceRole.entities.ExternalReference.filter({
      raqeem_entity_type: 'Meeting',
      raqeem_record_id: meeting_id,
      external_system: 'outlook',
      user_id: user.id,
    }).catch(() => []);

    let eventData;
    let action;

    if (existing && existing.length > 0) {
      const ref = existing[0];
      eventData = await graphRequest(accessToken, `/me/events/${ref.external_record_id}`, {
        method: 'PATCH',
        body: JSON.stringify(eventBody),
      });
      action = 'updated';
      await base44.asServiceRole.entities.ExternalReference.update(ref.id, {
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      });
    } else {
      eventData = await graphRequest(accessToken, '/me/events', {
        method: 'POST',
        body: JSON.stringify(eventBody),
      });
      action = 'created';

      if (eventData?.id) {
        await base44.asServiceRole.entities.ExternalReference.create({
          organization_id: meeting.organization_id,
          raqeem_entity_type: 'Meeting',
          raqeem_record_id: meeting_id,
          external_system: 'outlook',
          external_record_id: eventData.id,
          external_record_type: 'calendar_event',
          external_url: eventData.webLink,
          mapping_type: 'created_in',
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          user_id: user.id,
        });
      }
    }

    return Response.json({
      connected: true,
      event_id: eventData?.id || null,
      event_url: eventData?.webLink || null,
      status: action,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}