import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// CertifyAttendance — secretary certifies official attendance for a meeting.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { meeting_id, attendance_records } = body;

    if (!meeting_id || !attendance_records || !Array.isArray(attendance_records)) {
      return Response.json({ error: 'meeting_id, attendance_records (array) are required' }, { status: 400 });
    }

    const meeting = await base44.asServiceRole.entities.Meeting.get(meeting_id);
    if (!meeting) return Response.json({ error: 'Meeting not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: meeting.committee_id, capability: 'attendance.certify' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    let present = 0, absent = 0, apologies = 0;
    for (const rec of attendance_records) {
      const existing = await base44.asServiceRole.entities.Attendance
        .filter({ meeting_id, member_name: rec.member_name }).catch(() => []);

      const data = {
        organization_id: auth.organization_id,
        meeting_id, committee_id: meeting.committee_id,
        member_name: rec.member_name,
        member_role: rec.member_role || 'member',
        attendance_status: rec.attendance_status,
        arrival_time: rec.arrival_time || null,
        proxy_for: rec.proxy_for || null,
        notes: rec.notes || 'Certified by secretary',
      };

      if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.Attendance.update(existing[0].id, data);
      } else {
        await base44.asServiceRole.entities.Attendance.create(data);
      }

      if (rec.attendance_status === 'present') present++;
      else if (rec.attendance_status === 'absent') absent++;
      else if (rec.attendance_status === 'apologies') apologies++;
    }

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: meeting.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'attendance.certify', entity_type: 'Meeting', entity_id: meeting_id,
      entity_title: meeting.title,
      description: `Attendance certified: ${present} present, ${absent} absent, ${apologies} apologies`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok', meeting_id,
      certified: { present, absent, apologies, total: attendance_records.length },
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}