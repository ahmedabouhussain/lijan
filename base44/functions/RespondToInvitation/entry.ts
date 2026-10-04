import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse, requestClaims } from '../../shared/commandGuard.ts';

// RespondToInvitation — RSVP to a meeting.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { meeting_id, attendance_status, notes, proxy_for } = body;

    if (!meeting_id || !attendance_status) {
      return Response.json({ error: 'meeting_id, attendance_status are required' }, { status: 400 });
    }

    // The meeting is the trusted target, and `attendance.respond` is the person answering their OWN
    // invitation: the seat is the one the SERVER resolved for this caller, never a name in the
    // request, and the record is matched by identity so two people sharing a name never collide.
    const auth = await authorizeCommand(base44, {
      capability: 'attendance.respond',
      target_type: 'Meeting',
      target_id: meeting_id,
      ...requestClaims(body),
    });
    if (!auth.allowed) return refusalResponse(auth);
    const meeting = auth.target;

    const seat = auth.membership || null;
    if (!seat) {
      return Response.json({
        error: 'You hold no active seat in this committee',
        code: 'no_seat',
        policy_version: auth.policy_version,
        correlation_id: auth.correlation_id,
      }, { status: 403 });
    }

    // Identity of record: this caller's seat and user id. A display name is never a key.
    const existing = await base44.asServiceRole.entities.Attendance
      .filter({ meeting_id, committee_id: meeting.committee_id, member_user_id: auth.user.id }).catch(() => []);

    const attendanceData = {
      organization_id: auth.organization_id,
      meeting_id, committee_id: meeting.committee_id,
      member_id: seat.id,
      member_user_id: auth.user.id,
      member_name: auth.user.full_name || auth.user.email,
      member_role: seat.role || auth.effective_role,
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