import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// RespondToInvitation — RSVP to a meeting.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { meeting_id, attendance_status, notes, proxy_for } = body;

    if (!meeting_id || !attendance_status) {
      return Response.json({ error: 'meeting_id, attendance_status are required' }, { status: 400 });
    }

    const meeting = await base44.asServiceRole.entities.Meeting.get(meeting_id);
    if (!meeting) return Response.json({ error: 'Meeting not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: meeting.committee_id, capability: 'read' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    // Check for existing attendance record
    const existing = await base44.asServiceRole.entities.Attendance
      .filter({ meeting_id, member_name: auth.user.full_name || auth.user.email }).catch(() => []);

    const attendanceData = {
      organization_id: auth.organization_id,
      meeting_id, committee_id: meeting.committee_id,
      member_id: auth.membership?.id || null,
      member_name: auth.user.full_name || auth.user.email,
      member_role: auth.effective_role,
      attendance_status,
      proxy_for: proxy_for || null,
      notes: notes || null,
    };

    let attendance;
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.Attendance.update(existing[0].id, attendanceData);
      attendance = { id: existing[0].id, ...attendanceData };
    } else {
      attendance = await base44.asServiceRole.entities.Attendance.create(attendanceData);
    }

    return Response.json({ status: 'ok', attendance, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}