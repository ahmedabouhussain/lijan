import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { EXTRACT_VERSION, assessAnswer } from '../../shared/executionExtract.ts';

// AnswerActionClarification — the committee's answer to a question the receiving party asked through
// an extract link.
//
// Governed (`action.admin`) on a TRUSTED TARGET: the clarification row, whose parent chain reaches the
// Action it belongs to, so the committee is derived from the record rather than taken from the request.
// Answering changes the QUESTION's state and nothing else: the obligation, its progress, its deadline
// and its evidence are untouched — a question never becomes a back-door update.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const id = typeof body.clarification_id === 'string' ? body.clarification_id : '';
    if (!id) return Response.json({ error: 'A question must be named', error_ar: 'يجب تسمية السؤال', code: 'clarification_required' }, { status: 400 });

    const auth = await authorizeCommand(base44, {
      capability: 'action.admin',
      target_type: 'ActionClarification',
      target_id: id,
      claimed_committee_id: typeof body.committee_id === 'string' && body.committee_id ? body.committee_id : null,
    });
    if (!auth.allowed) return refusalResponse(auth);
    const row = auth.target;

    const verdict = assessAnswer({ clarification: row, answer: body.answer });
    if (!verdict.ok) {
      return Response.json({ error: verdict.reason, error_ar: verdict.reason_ar, code: verdict.code, contract_version: EXTRACT_VERSION }, { status: verdict.status });
    }

    const now = new Date().toISOString();
    await sr.entities.ActionClarification.update(row.id, {
      answer: verdict.answer,
      status: 'answered',
      answered_at: now,
      answered_by_user_id: auth.user.id,
      answered_by_name: auth.user.full_name || auth.user.email,
      answered_by_capacity: auth.effective_role || auth.authority_context || null,
    });
    await sr.entities.AuditEvent.create({
      organization_id: row.organization_id, committee_id: row.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'action.extract_question_answered', entity_type: 'ActionClarification', entity_id: row.id,
      entity_title: row.raised_by_name,
      description: `A question raised through an execution-extract link was answered on action ${row.action_id}`,
      authority_context: `capability:action.admin:${auth.policy_version}`,
      correlation_id: auth.correlation_id,
    }).catch(() => null);

    return Response.json({
      status: 'ok',
      contract_version: EXTRACT_VERSION,
      clarification: { id: row.id, status: 'answered', answered_at: now, answered_by_capacity: auth.effective_role || null },
      obligation_unchanged: { action_id: row.action_id, status_touched: false, deadline_touched: false, evidence_touched: false },
      policy_version: auth.policy_version,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: EXTRACT_VERSION }, { status: 500 });
  }
}