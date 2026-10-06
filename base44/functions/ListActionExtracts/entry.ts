import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  EXTRACT_VERSION, EXTRACT_SECTIONS, EXTRACT_SECTION_KEYS, ALWAYS_INCLUDED_SECTIONS, assessGrant,
  EXCLUDED_BY_CONTRACT, ACKNOWLEDGEMENT_SEMANTICS, QUESTION_CATEGORIES,
} from '../../shared/executionExtract.ts';

// ListActionExtracts — the committee's own view of the links it has issued on ONE obligation, and of
// the questions the recipient asked through them.
//
// Governed read: `action.admin` on the trusted Action record. It reports four different facts
// separately (sent · opened · acknowledged · questions), and it hands the link back ONLY to a seat
// that holds the right to issue it in the first place — the same capability that created it. A read
// that could not be performed is named, never returned as an empty list.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const actionId = typeof body.action_id === 'string' ? body.action_id : '';
    if (!actionId) return Response.json({ error: 'An obligation must be named', error_ar: 'يجب تسمية الالتزام', code: 'action_required' }, { status: 400 });

    const auth = await authorizeCommand(base44, {
      capability: 'action.admin',
      target_type: 'Action',
      target_id: actionId,
      claimed_committee_id: typeof body.committee_id === 'string' && body.committee_id ? body.committee_id : null,
    });
    if (!auth.allowed) return refusalResponse(auth);
    const action = auth.target;

    const unread: any[] = [];
    const read = async (source: string, promise: Promise<any>) => {
      try {
        const rows = await promise;
        return Array.isArray(rows) ? rows : (rows?.items || []);
      } catch (e) {
        unread.push({ source, reason: e?.message || 'read failed' });
        return [];
      }
    };

    const grants = await read('ActionExtractGrant (links on this obligation)', sr.entities.ActionExtractGrant.filter({ action_id: action.id }));
    const clarifications = await read('ActionClarification (questions on this obligation)', sr.entities.ActionClarification.filter({ action_id: action.id }));

    const rows = grants
      .sort((a, b) => String(b.shared_at || '').localeCompare(String(a.shared_at || '')))
      .map((g) => {
        const access = assessGrant({ grant: g });
        const openQuestions = clarifications.filter((c) => c.grant_id === g.id && c.status === 'raised').length;
        return {
          id: g.id,
          recipient: {
            name: g.recipient_name, name_en: g.recipient_name_en,
            organization: g.recipient_organization, organization_en: g.recipient_organization_en,
            purpose: g.purpose, email: g.recipient_email,
          },
          // The four facts, kept apart on purpose.
          facts: {
            sent_at: g.shared_at || null,
            opened_at: g.opened_at || null,
            acknowledged_at: g.acknowledged_at || null,
            acknowledged_by_name: g.acknowledged_by_name || null,
            acknowledgement_note: g.acknowledgement_note || null,
            questions_raised: clarifications.filter((c) => c.grant_id === g.id).length,
            questions_open: openQuestions,
            views: Number(g.view_count || 0),
            last_viewed_at: g.last_viewed_at || null,
          },
          validity: { valid_from: g.valid_from || null, expires_at: g.expires_at || null, usable_now: access.ok === true },
          state: access.ok ? access.state : (access.code || 'unusable'),
          state_code: access.ok ? null : access.code,
          state_reason_ar: access.ok ? null : access.reason_ar,
          permitted_sections: g.permitted_sections || [],
          // The link is returned only to a seat that may issue it: the guard already established that.
          link_path: g.status === 'revoked' ? null : `/extract/${g.access_token}`,
          revocable: g.status !== 'revoked' && access.code !== 'revoked',
          contract_version: g.contract_version || EXTRACT_VERSION,
        };
      });

    const questions = clarifications
      .sort((a, b) => String(a.raised_at || '').localeCompare(String(b.raised_at || '')))
      .map((c) => ({
        id: c.id,
        action_id: c.action_id,
        grant_id: c.grant_id,
        category: c.category,
        category_label: QUESTION_CATEGORIES[c.category] || null,
        question: c.question,
        raised_by_name: c.raised_by_name,
        raised_by_organization: c.raised_by_organization,
        raised_at: c.raised_at || null,
        status: c.status,
        answer: c.answer || null,
        answered_at: c.answered_at || null,
        answered_by_name: c.answered_by_name || null,
        answered_by_capacity: c.answered_by_capacity || null,
      }));

    return Response.json({
      status: 'ok',
      contract_version: EXTRACT_VERSION,
      action: { id: action.id, title: action.title_ar || action.title, title_en: action.title_en || action.title, status: action.status },
      grants: rows,
      questions,
      // The vocabulary travels from the contract so no surface re-types it (or drifts from it).
      section_vocabulary: EXTRACT_SECTION_KEYS.map((k) => ({ key: k, ...EXTRACT_SECTIONS[k] })),
      always_included_sections: ALWAYS_INCLUDED_SECTIONS,
      counts: { grants: rows.length, opened: rows.filter((r) => r.facts.opened_at).length, acknowledged: rows.filter((r) => r.facts.acknowledged_at).length, questions_open: questions.filter((q) => q.status === 'raised').length },
      semantics: ACKNOWLEDGEMENT_SEMANTICS,
      excluded_by_contract: EXCLUDED_BY_CONTRACT,
      unread_sources: unread,
      notice: {
        ar: 'الإقرار ثبوت استلام فقط، وفتح الرابط أضعف منه: لا يُعدّ أيٌّ منهما اعتمادًا ولا إنجازًا ولا تحققًا.',
        en: 'An acknowledgement is a receipt and opening the link is weaker still: neither is approval, completion or verification.',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: EXTRACT_VERSION }, { status: 500 });
  }
}