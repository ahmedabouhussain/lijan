import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  EXTRACT_VERSION, EXTRACT_SCOPE, assessGrant, stateAfterOpen, buildActionExtract,
  ACKNOWLEDGEMENT_SEMANTICS, QUESTION_CATEGORIES, QUESTION_CATEGORY_KEYS, MAX_OPEN_QUESTIONS,
} from '../../shared/executionExtract.ts';

// GetActionExtractView — the PUBLIC, obligation-scoped extract reached by link (/extract/:token).
//
// No session and no app role: the token is the whole capability. The function reads exactly what the
// contract permits, refuses a dead link with the contract's own wording, records every permitted read,
// and never names material the recipient may not see. Opening the link is the weakest of the four
// facts — it is recorded as `opened`, and it approves nothing.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) {
      return Response.json({ error: 'An extract link is required', error_ar: 'رابط المستخلص مطلوب', code: 'token_required', contract_version: EXTRACT_VERSION }, { status: 400 });
    }

    const grantRows = await sr.entities.ActionExtractGrant.filter({ access_token: token }).catch(() => []);
    const grant = (Array.isArray(grantRows) ? grantRows : grantRows?.items || [])[0] || null;

    const access = assessGrant({ grant });
    if (!access.ok) {
      // A dead link is told it is dead (a useful human answer), never what it used to contain.
      return Response.json({
        error: access.reason, error_ar: access.reason_ar, code: access.code, contract_version: EXTRACT_VERSION,
      }, { status: access.status });
    }
    if (access.access_scope !== EXTRACT_SCOPE) {
      return Response.json({ error: 'This link carries an unsupported scope', error_ar: 'نطاق هذا الرابط غير مدعوم', code: 'scope_unsupported' }, { status: 409 });
    }

    const action = await sr.entities.Action.get(grant.action_id).catch(() => null);
    if (!action) {
      return Response.json({ error: 'The named obligation is not available now', error_ar: 'الالتزام المُسمّى غير متاح الآن', code: 'obligation_unavailable', contract_version: EXTRACT_VERSION }, { status: 410 });
    }
    const decision = action.decision_id ? await sr.entities.Decision.get(action.decision_id).catch(() => null) : null;
    const committee = await sr.entities.Committee.get(grant.committee_id).catch(() => null);
    const organization = committee?.organization_id ? await sr.entities.Organization.get(committee.organization_id).catch(() => null) : null;

    const extract = buildActionExtract({ action, decision, committee, organization, grant });

    const questions = (await sr.entities.ActionClarification.filter({ grant_id: grant.id }).catch(() => [])) || [];
    const shaped = (Array.isArray(questions) ? questions : questions?.items || [])
      .sort((a, b) => String(a.raised_at || '').localeCompare(String(b.raised_at || '')))
      .map((c) => ({
        id: c.id,
        category: c.category,
        category_label: QUESTION_CATEGORIES[c.category] || null,
        question: c.question,
        raised_at: c.raised_at || null,
        status: c.status,
        answer: c.status === 'raised' ? null : (c.answer || null),
        answered_at: c.answered_at || null,
        answered_by_capacity: c.answered_by_capacity || null,
      }));

    // The read is recorded: the link has no session, so the trail is the only evidence of use.
    await sr.entities.ActionExtractGrant.update(grant.id, {
      status: stateAfterOpen(grant),
      opened_at: grant.opened_at || new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
      view_count: (grant.view_count || 0) + 1,
    }).catch(() => null);
    await sr.entities.AuditEvent.create({
      organization_id: grant.organization_id, committee_id: grant.committee_id,
      actor_user_id: null, actor_name: grant.recipient_name, actor_email: grant.recipient_email || null,
      action: 'action.extract_view', entity_type: 'ActionExtractGrant', entity_id: grant.id,
      entity_title: grant.recipient_name,
      description: `Execution-extract read by the receiving party for action ${grant.action_id} (link token)`,
      authority_context: `extract:${EXTRACT_SCOPE}:${EXTRACT_VERSION}`,
    }).catch(() => null);

    return Response.json({
      status: 'ok',
      contract_version: EXTRACT_VERSION,
      access: {
        state: access.state,
        opened: true,
        acknowledged: access.acknowledged,
        acknowledged_at: grant.acknowledged_at || null,
        acknowledged_by_name: grant.acknowledged_by_name || null,
      },
      view: extract,
      questions: shaped,
      question_categories: QUESTION_CATEGORY_KEYS.map((k) => ({ key: k, ...QUESTION_CATEGORIES[k] })),
      limits: {
        max_open_questions: MAX_OPEN_QUESTIONS,
        ar: 'نطاق هذا الرابط التزام واحد فقط: لا يفتح سجل اللجنة ولا بقية إجراءاتها ولا مكتبة مستنداتها، وصلاحيته محدودة بالوقت وقابلة للإلغاء.',
        en: 'This link opens one obligation only: it does not open the committee register, its other obligations or its document library, and it is time-bounded and revocable.',
      },
      semantics: ACKNOWLEDGEMENT_SEMANTICS,
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: EXTRACT_VERSION }, { status: 500 });
  }
}