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

    // If minutes already exist, return them (idempotent) — and say plainly when the stored draft's
    // date no longer matches the meeting record. A stale draft is REPORTED, never silently served
    // as if it were current, and it is never overwritten (approved minutes are not disposable).
    if (existing && existing.length > 0) {
      const draft = existing[0];
      const drifted = !!(draft.call_to_order && meeting.date && draft.call_to_order !== meeting.date);
      return Response.json({
        minutes_id: draft.id,
        status: 'exists',
        minutes: draft,
        source_meeting_date: meeting.date || null,
        stale: drifted,
        stale_reason: drifted
          ? {
            ar: `تاريخ المسودة المحفوظة (${draft.call_to_order}) لا يطابق تاريخ الاجتماع في سجله (${meeting.date}). راجع المسودة قبل اعتمادها؛ لا تُعتمد كما هي.`,
            en: `The stored draft date (${draft.call_to_order}) does not match the meeting record date (${meeting.date}). Review the draft before approving it; it must not be approved as it stands.`,
          }
          : null,
      });
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
- التاريخ (المعتمد من سجل الاجتماع — اذكره كما هو حرفيًا ولا تُدرج أي تاريخ آخر): ${meeting.date || '—'}
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

اكتب المحضر بلغة رسمية حكومية واضحة، مع التزام بالموضوعية وتجنب أي إضافة من عندك — استخدم فقط البيانات المقدمة، واترك الأقسام غير المتوفرة بكتابة "يُستكمل لاحقاً".

قيود إلزامية:
- لا تُدرج أي وسوم HTML على الإطلاق (لا <br> ولا <div> ولا غيرها). استخدم Markdown فقط.
- لا تُنشئ تواريخ أو أسماء أو أرقامًا غير موجودة في البيانات المقدمة، ولا تُغيّر تاريخ الاجتماع.`;

    // Generate draft via LLM
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
    });

    const rawMinutesBody = typeof llmResponse === 'string' ? llmResponse : (llmResponse?.response || llmResponse?.text || JSON.stringify(llmResponse));

    // Untrusted model output is reduced to text before it is stored: no markup passes through, so a
    // draft can never print raw HTML inside an official record.
    const stripMarkup = (value) => String(value || '')
      .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // The DATE IS COMPOSED BY THE SERVER from the meeting record, not by the model: whatever the
    // draft says elsewhere, the authoritative date is stated once here in both languages.
    const nowIso = new Date().toISOString();
    const meetingTs = meeting.date ? Date.parse(meeting.date) : NaN;
    const meetingInFuture = Number.isFinite(meetingTs) && meetingTs > Date.parse(nowIso);
    const displayDate = (() => {
      try {
        return new Date(meeting.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Qatar' });
      } catch (_e) { return meeting.date || '—'; }
    })();
    const provenanceBlock = [
      '',
      `> **تاريخ الاجتماع المعتمد (من سجل الاجتماع):** ${meeting.date || '—'} — ${displayDate}`,
      `> **Authoritative meeting date (from the meeting record):** ${meeting.date || '—'} — ${displayDate}`,
      `> _المصدر: سجل الاجتماع — لا تاريخ آخر مقبول · Source: the meeting record — no other date is authoritative · ${'أُنشئت المسودة'}: ${nowIso}_`,
      ...(meetingInFuture
        ? ['', `> **⚠️ ${'مسودة لاجتماع لم يُعقد بعد. لا تُعرض كمحضر مكتمل ولا تُعتمد قبل انعقاد الاجتماع.'} / Draft for a meeting that has not yet taken place. Not completed minutes, and not approvable before the meeting is held.**`]
        : []),
      '',
    ].join('\n');
    const minutesBody = brandedMarkdownHeader(`محضر ${meeting.title || ''}`) + '\n' + provenanceBlock + '\n' + stripMarkup(rawMinutesBody);

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