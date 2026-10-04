import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { brandedMarkdownHeader } from '../../shared/brandHeader.ts';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const meetingId = body.meeting_id;
    if (!meetingId) return Response.json({ error: 'meeting_id is required' }, { status: 400 });

    // Authority on a TRUSTED target: minutes are drafted in the MEETING's own committee. This
    // function previously wrote minutes on an authenticated-only check, with no authority at all.
    const auth = await authorizeCommand(base44, {
      capability: 'minutes.draft',
      target_type: 'Meeting',
      target_id: meetingId,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    // Fetch meeting + related data
    const meeting = auth.target;

    const committeeId = meeting.committee_id;
    const [committee, members, agendaItems, decisions, attendance, existing] = await Promise.all([
      committeeId ? base44.asServiceRole.entities.Committee.get(committeeId).catch(() => null) : Promise.resolve(null),
      committeeId ? base44.asServiceRole.entities.CommitteeMember.filter({ committee_id: committeeId }).catch(() => []) : Promise.resolve([]),
      base44.asServiceRole.entities.AgendaItem.filter({ meeting_id: meetingId }).catch(() => []),
      base44.asServiceRole.entities.Decision.filter({ meeting_id: meetingId }).catch(() => []),
      base44.asServiceRole.entities.Attendance.filter({ meeting_id: meetingId }).catch(() => []),
      base44.asServiceRole.entities.MeetingMinutes.filter({ meeting_id: meetingId }).catch(() => []),
    ]);

    // If minutes already exist, return them (idempotent)
    if (existing && existing.length > 0) {
      return Response.json({ minutes_id: existing[0].id, status: 'exists', minutes: existing[0] });
    }

    // Build attendance summary
    const present = (attendance || []).filter((a) => a.attendance_status === 'present' || a.attendance_status === 'late');
    const absent = (attendance || []).filter((a) => a.attendance_status === 'absent');
    const apologies = (attendance || []).filter((a) => a.attendance_status === 'apologies');
    const quorumMet = present.length >= (meeting.quorum_required || 3);

    // Build context for the LLM
    const agendaText = (agendaItems || [])
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
      .map((item, i) => `${i + 1}. ${item.title || item.title_ar || ''} — ${item.objective || ''} [الحالة: ${item.status}]${item.presenter ? ` | المقدم: ${item.presenter}` : ''}`)
      .join('\n');

    const decisionsText = (decisions || [])
      .map((d, i) => `${i + 1}. ${d.title} — الحالة: ${d.status}${d.vote_for != null ? ` | موافق: ${d.vote_for} رافض: ${d.vote_against} ممتنع: ${d.vote_abstain}` : ''}${d.owner_name ? ` | المسؤول: ${d.owner_name}` : ''}${d.deadline ? ` | الموعد: ${d.deadline}` : ''}`)
      .join('\n');

    const attendanceText = (attendance || [])
      .map((a) => `${a.member_name} (${a.member_role || 'عضو'}): ${a.attendance_status}`)
      .join('\n');

    const prompt = `أنت أمين سر حكومي خبير في كتابة محاضر اجتماعات اللجان الوطنية باللغة العربية الفصحى الرسمية.
اكتب محضر اجتماع رسمي ومحترف بصيغة Markdown منظمة، يتضمن الأقسام التالية:

## معلومات الاجتماع
- اسم اللجنة: ${committee?.name_ar || ''}
- عنوان الاجتماع: ${meeting.title || meeting.title_ar || ''}
- التاريخ: ${meeting.date || ''}
- الوضع: ${meeting.mode || ''}
- الموقع: ${meeting.location || ''}

## الحضور والغياب
${attendanceText || 'لم يُسجل بعد'}

## افتتاح الجلسة
(وقت افتتاح الجلسة وتحقق النصاب — النصاب المطلوب: ${meeting.quorum_required || 3}، تحقق النصاب: ${quorumMet ? 'نعم' : 'لا'})

## اعتماد محضر الاجتماع السابق
(محضر الاجتماع السابق — هل تم اعتماده)

## جدول الأعمال والمداولات
${agendaText || 'لا توجد بنود جدول'}

## القرارات المتخذة
${decisionsText || 'لا توجد قرارات'}

## الإجراءات المسندة
(الإجراءات التنفيذية الناشئة عن القرارات)

## ختام الجلسة
(وقت الختام والاجتماع القادم)

اكتب المحضر بلغة رسمية حكومية واضحة، مع التزام بالموضوعية وتجنب أي إضافة من عندك — استخدم فقط البيانات المقدمة، واترك الأقسام غير المتوفرة بكتابة "يُستكمل لاحقاً".`;

    // Generate draft via LLM
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
    });

    const rawMinutesBody = typeof llmResponse === 'string' ? llmResponse : (llmResponse?.response || llmResponse?.text || JSON.stringify(llmResponse));
    const minutesBody = brandedMarkdownHeader(`محضر ${meeting.title || ''}`) + '\n' + rawMinutesBody;

    // Generate a short Arabic summary
    const summaryPrompt = `لخص المحضر التالي لاجتماع رسمي في فقرة عربية واحدة (3-4 أسطر) تذكر فيها أهم القرارات والإجراءات:\n\n${minutesBody}`;
    const summaryResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: summaryPrompt });
    const summaryAr = typeof summaryResponse === 'string' ? summaryResponse : (summaryResponse?.response || '');

    // Create the minutes record
    const minutes = await base44.asServiceRole.entities.MeetingMinutes.create({
      meeting_id: meetingId,
      committee_id: committeeId,
      minutes_number: `M-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      call_to_order: meeting.date,
      adjournment: null,
      present_count: present.length,
      absent_count: absent.length,
      apologies_count: apologies.length,
      quorum_met: quorumMet,
      previous_minutes_approved: false,
      body: minutesBody,
      summary_ar: summaryAr,
      generated_by_ai: true,
      drafted_by_name: user.full_name || user.email,
      status: 'draft',
    });

    // AIOutputLedger — every AI operation must be logged
    await base44.asServiceRole.entities.AIOutputLedger.create({
      organization_id: committee?.organization_id || null,
      output_type: 'meeting_minutes',
      source_entity_type: 'MeetingMinutes',
      source_entity_id: minutes.id,
      source_title: `محضر ${meeting.title || ''}`,
      committee_id: committeeId,
      model_used: 'automatic',
      prompt_summary: 'إنشاء مسودة محضر اجتماع بالذكاء الاصطناعي',
      output_summary: (minutesBody || '').substring(0, 500),
      generated_at: new Date().toISOString(),
      generated_by_user_id: user.id,
      generated_by_name: user.full_name || user.email,
      human_reviewed: false,
      status: 'generated',
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'create',
      entity_type: 'MeetingMinutes',
      entity_id: minutes.id,
      entity_title: `محضر ${meeting.title || ''}`,
      description: 'إنشاء مسودة محضر اجتماع تلقائياً',
      actor_name: user.full_name || user.email,
    });

    return Response.json({ minutes_id: minutes.id, status: 'created', minutes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}