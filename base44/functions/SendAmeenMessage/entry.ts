import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolvePrincipal, authorizeRead, refusalBody, refusalStatus } from '../../shared/governedReadPolicy.ts';
import { buildAmeenLanguageContract } from '../../shared/ameenLanguageContract.ts';
export default async function(req) {
  let language = 'en';
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in to consult AMEEN', code: 'unauthenticated' }, { status: 401 });
    const body = await req.json();
    if (!['ar','en'].includes(body.language)) return Response.json({ code: 'language_required' }, { status: 400 });
    language = body.language;
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question || question.length > 6000 || typeof body.conversation_id !== 'string') return Response.json({ code: 'invalid_request' }, { status: 400 });
    const conversation = await base44.agents.getConversation(body.conversation_id);
    const meta = conversation.metadata || {};
    if (typeof body.scope_key !== 'string' || meta.scope !== body.scope_key || meta.context_key !== body.context_key) return Response.json({ error: 'Record not available', code: 'not_found' }, { status: 404 });
    if (meta.committee_id && meta.committee_id !== body.committee_id) return Response.json({ error: 'Record not available', code: 'not_found' }, { status: 404 });
    if (meta.organization_id && meta.organization_id !== body.organization_id) return Response.json({ error: 'Record not available', code: 'not_found' }, { status: 404 });
    if (body.committee_id) {
      const principal = await resolvePrincipal({ sr: base44.asServiceRole, body, callerUser: user });
      const verdict = await authorizeRead({ base44, sr: base44.asServiceRole, principal, record: { committee_id: body.committee_id } });
      if (!verdict.allowed) return Response.json(refusalBody(verdict.reason), { status: refusalStatus(verdict.reason) });
      const boundCommitteeRef = meta.scope.split('::')[3];
      if (!meta.committee_id && ![verdict.committee.id, verdict.committee.public_id, verdict.committee.slug].includes(boundCommitteeRef)) return Response.json({ error: 'Record not available', code: 'not_found' }, { status: 404 });
    } else if (meta.committee_id || !['-', undefined].includes(meta.scope.split('::')[3])) {
      return Response.json({ error: 'Record not available', code: 'not_found' }, { status: 404 });
    } else if (body.showcase_token) {
      const principal = await resolvePrincipal({ sr: base44.asServiceRole, body, callerUser: user });
      if (principal.kind !== 'showcase') return Response.json({ code: 'no_session' }, { status: 401 });
    }
    const localeChanged = meta.ui_locale !== language;
    const updatedMetadata = { ...meta, ui_locale: language, response_language: language, direction: language === 'ar' ? 'rtl' : 'ltr' };
    if (localeChanged) {
      updatedMetadata.locale_history = [...(Array.isArray(meta.locale_history) ? meta.locale_history : []), { from: meta.ui_locale || null, to: language, at: new Date().toISOString() }];
      await base44.agents.updateConversation(conversation.id, { metadata: updatedMetadata });
      conversation.metadata = updatedMetadata;
    }
    await base44.agents.addMessage(conversation, { role: 'user', content: buildAmeenLanguageContract(language) + '\n' + question.replace(/\[\[\/?AMEEN-LOCALE\]\]/g, '') });
    return Response.json({ ok: true, language, direction: language === 'ar' ? 'rtl' : 'ltr' });
  } catch (error) {
    return Response.json({ error: language === 'ar' ? 'تعذّر إرسال الطلب إلى أمين.' : 'The request to AMEEN could not be sent.', code: 'ameen_request_failed' }, { status: 500 });
  }
}