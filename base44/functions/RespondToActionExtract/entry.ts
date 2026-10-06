import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  EXTRACT_VERSION, assessGrant, assessAcknowledgement, assessQuestion,
  ACKNOWLEDGEMENT_SEMANTICS, MAX_OPEN_QUESTIONS, refusal,
} from '../../shared/executionExtract.ts';

// RespondToActionExtract — the receiving party's TWO acts, and nothing else: acknowledge receipt, or
// ask a question.
//
// Public on purpose (the recipient has no account), capability-token gated, and bounded to the grant's
// own row plus a new question row on the SAME obligation. It cannot touch the action's status, its
// progress, its deadline or its evidence: an acknowledgement is a receipt, and a question is a
// question. A second acknowledgement is answered idempotently rather than refused — a receipt recorded
// twice is still one receipt, never a second act.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const act = typeof body.act === 'string' ? body.act : '';

    if (!token) {
      const r = refusal('token_required');
      return Response.json({ error: r.reason, error_ar: r.reason_ar, code: r.code, contract_version: EXTRACT_VERSION }, { status: r.status });
    }
    if (!['acknowledge', 'ask'].includes(act)) {
      return Response.json({ error: 'The act must be acknowledge or ask', error_ar: 'الفعل يجب أن يكون إقرارًا أو سؤالًا', code: 'act_unsupported', contract_version: EXTRACT_VERSION }, { status: 400 });
    }

    const grantRows = await sr.entities.ActionExtractGrant.filter({ access_token: token }).catch(() => []);
    const grant = (Array.isArray(grantRows) ? grantRows : grantRows?.items || [])[0] || null;

    const access = assessGrant({ grant });
    if (!access.ok) {
      return Response.json({ error: access.reason, error_ar: access.reason_ar, code: access.code, contract_version: EXTRACT_VERSION }, { status: access.status });
    }

    if (act === 'acknowledge') {
      const verdict = assessAcknowledgement({ grant, name: body.name, note: body.note });
      if (!verdict.ok) {
        return Response.json({ error: verdict.reason, error_ar: verdict.reason_ar, code: verdict.code, contract_version: EXTRACT_VERSION }, { status: verdict.status });
      }
      if (verdict.idempotent) {
        return Response.json({
          status: 'ok', contract_version: EXTRACT_VERSION, idempotent: true,
          receipt: { acknowledged_at: grant.acknowledged_at || null, acknowledged_by_name: grant.acknowledged_by_name || null },
          semantics: ACKNOWLEDGEMENT_SEMANTICS,
        });
      }
      const now = new Date().toISOString();
      await sr.entities.ActionExtractGrant.update(grant.id, {
        status: 'acknowledged',
        acknowledged_at: now,
        acknowledged_by_name: verdict.acknowledged_by_name,
        acknowledgement_note: verdict.note,
        opened_at: grant.opened_at || now,
        last_viewed_at: now,
      });
      await sr.entities.AuditEvent.create({
        organization_id: grant.organization_id, committee_id: grant.committee_id,
        actor_user_id: null, actor_name: verdict.acknowledged_by_name, actor_email: grant.recipient_email || null,
        action: 'action.extract_acknowledged', entity_type: 'ActionExtractGrant', entity_id: grant.id,
        entity_title: grant.recipient_name,
        description: `Receipt acknowledged by the receiving party for action ${grant.action_id}`,
        authority_context: `extract:receipt:${EXTRACT_VERSION}`,
      }).catch(() => null);
      return Response.json({
        status: 'ok', contract_version: EXTRACT_VERSION, idempotent: false,
        receipt: { acknowledged_at: now, acknowledged_by_name: verdict.acknowledged_by_name },
        effect: verdict.effect,
        semantics: ACKNOWLEDGEMENT_SEMANTICS,
      });
    }

    // ── ask: a question is a question ─────────────────────────────────────────────────────────────
    const openRows = await sr.entities.ActionClarification.filter({ grant_id: grant.id, status: 'raised' }).catch(() => []);
    const openCount = (Array.isArray(openRows) ? openRows : openRows?.items || []).length;

    const verdict = assessQuestion({ grant, category: body.category, question: body.question, open_count: openCount });
    if (!verdict.ok) {
      return Response.json({ error: verdict.reason, error_ar: verdict.reason_ar, code: verdict.code, contract_version: EXTRACT_VERSION }, { status: verdict.status });
    }

    const now = new Date().toISOString();
    const question = await sr.entities.ActionClarification.create({
      organization_id: grant.organization_id,
      committee_id: grant.committee_id,
      action_id: grant.action_id,
      grant_id: grant.id,
      category: verdict.category,
      question: verdict.question,
      raised_by_name: String(body.name || '').trim() || grant.recipient_name,
      raised_by_organization: grant.recipient_organization || null,
      status: 'raised',
      raised_at: now,
      contract_version: EXTRACT_VERSION,
      data_origin: 'operational',
      is_demo_data: false,
    });
    await sr.entities.ActionExtractGrant.update(grant.id, {
      opened_at: grant.opened_at || now,
      last_viewed_at: now,
    }).catch(() => null);
    await sr.entities.AuditEvent.create({
      organization_id: grant.organization_id, committee_id: grant.committee_id,
      actor_user_id: null, actor_name: question.raised_by_name, actor_email: grant.recipient_email || null,
      action: 'action.extract_question_raised', entity_type: 'ActionClarification', entity_id: question.id,
      entity_title: grant.recipient_name,
      description: `A clarification was asked by the receiving party on action ${grant.action_id}`,
      authority_context: `extract:question:${EXTRACT_VERSION}`,
    }).catch(() => null);

    return Response.json({
      status: 'ok',
      contract_version: EXTRACT_VERSION,
      question: { id: question.id, category: question.category, question: question.question, status: question.status, raised_at: question.raised_at },
      changes_state: false,
      changes_deadline: false,
      open_questions: openCount + 1,
      max_open_questions: MAX_OPEN_QUESTIONS,
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: EXTRACT_VERSION }, { status: 500 });
  }
}