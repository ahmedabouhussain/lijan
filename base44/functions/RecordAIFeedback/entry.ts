import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// RecordAIFeedback — يسجّل حكم الإنسان على مخرج الذكاء: مفيد/يحتاج تصحيحًا/غير مفيد.
// حلقة التغذية الراجعة العالمية: لا يُقال إن الذكاء دقيق إلا بقياس الإنسان على المخرج نفسه.
// السلطة: نفس نطاق الجهة (RLS على AIOutputLedger يسمح للمنشئ أو المدير).

const VALID_RATINGS = ['helpful', 'needs_correction', 'not_helpful'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    const { ledger_id, feedback_rating, feedback_note } = body;

    if (!ledger_id) return Response.json({ error: 'ledger_id is required' }, { status: 400 });
    if (!VALID_RATINGS.includes(feedback_rating)) {
      return Response.json({ error: 'feedback_rating must be one of: ' + VALID_RATINGS.join(', '), code: 'invalid_rating' }, { status: 400 });
    }

    const entry = await base44.asServiceRole.entities.AIOutputLedger.get(ledger_id).catch(() => null);
    if (!entry) return Response.json({ error: 'AI output not found', code: 'not_found' }, { status: 404 });

    // احتجاز النطاق: لا يُسجَّل حكم على مخرج من جهة أخرى
    if (entry.organization_id && user.data?.active_org_id && entry.organization_id !== user.data.active_org_id) {
      return Response.json({ error: 'This AI output belongs to another organization', code: 'cross_org' }, { status: 403 });
    }

    await base44.asServiceRole.entities.AIOutputLedger.update(ledger_id, {
      feedback_rating,
      feedback_note: feedback_note || null,
      feedback_by_user_id: user.id,
      feedback_by_name: user.full_name || user.email,
      feedback_at: new Date().toISOString(),
      human_reviewed: true,
      reviewed_by_name: user.full_name || user.email,
      reviewed_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: entry.organization_id || null,
      committee_id: entry.committee_id || null,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: 'update',
      entity_type: 'AIOutputLedger',
      entity_id: ledger_id,
      entity_title: entry.output_type,
      description: `AI feedback recorded: ${feedback_rating}`,
      correlation_id: 'ai_feedback_' + Date.now().toString(36),
    });

    return Response.json({
      status: 'ok', ledger_id, feedback_rating,
      message: 'Thank you. Your feedback has been recorded and will help improve the governed prompts.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}