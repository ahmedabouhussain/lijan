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
    if (conversation.metadata?.ui_locale !== language) return Response.json({ error: language === 'ar' ? 'أعد فتح المحادثة باللغة الحالية.' : 'Reopen the conversation in the selected language.', code: 'language_scope_mismatch' }, { status: 409 });
    if (body.committee_id) {
      const principal = await resolvePrincipal({ sr: base44.asServiceRole, body, callerUser: user });
      const verdict = await authorizeRead({ base44, sr: base44.asServiceRole, principal, record: { committee_id: body.committee_id } });
      if (!verdict.allowed) return Response.json(refusalBody(verdict.reason), { status: refusalStatus(verdict.reason) });
    } else if (body.showcase_token) {
      const principal = await resolvePrincipal({ sr: base44.asServiceRole, body, callerUser: user });
      if (principal.kind !== 'showcase') return Response.json({ code: 'no_session' }, { status: 401 });
    }
    await base44.agents.addMessage(conversation, { role: 'user', content: buildAmeenLanguageContract(language) + '\n' + question.replace(/\[\[\/?AMEEN-LOCALE\]\]/g, '') });
    return Response.json({ ok: true, language, direction: language === 'ar' ? 'rtl' : 'ltr' });
  } catch (error) {
    return Response.json({ error: language === 'ar' ? 'تعذّر إرسال الطلب إلى أمين.' : 'The request to AMEEN could not be sent.', code: 'ameen_request_failed' }, { status: 500 });
  }
}