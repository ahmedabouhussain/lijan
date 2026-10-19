import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolvePrincipal, authorizeRead, refusalBody, refusalStatus } from '../../shared/governedReadPolicy.ts';
import { buildAmeenLanguageContract } from '../../shared/ameenLanguageContract.ts';

// SendAmeenMessage — the ONE path a consultation takes into «أمين».
//
// The principal is decided by the server, and is exactly one of two kinds:
//   • a registered account acting in a live scope, or
//   • a server-issued exploration (showcase) session — the SAME session ResolveAmeenContext
//     accepts. An exploration visitor holds no platform account at all, so demanding one here
//     would make the exploration experience unusable: the token is the authority, never an account.
//     A live scope still demands a registered account, with no exceptions.
//
// Every refusal names its own reason. One generic sentence for a lapsed session, a foreign
// conversation and an engine fault alike tells the reader nothing — and hid a real fault.

const REFUSALS = {
  unauthenticated: {
    ar: 'سجّل الدخول لاستخدام «أمين».',
    en: 'Sign in to consult AMEEN.',
  },
  no_session: {
    ar: 'انتهت جلسة الاستكشاف أو أُبطلت — أعد الدخول إلى العرض التجريبي.',
    en: 'The exploration session has ended or was revoked — re-enter the exploration experience.',
  },
  invalid_request: {
    ar: 'تعذّر قراءة الطلب. أعد إرساله.',
    en: 'The request could not be read. Please send it again.',
  },
  conversation_not_available: {
    ar: 'لم تعد هذه المحادثة متاحة في سياقك الحالي — سيُفتح سياق جديد.',
    en: 'This conversation is no longer available in your current context — a new one will be opened.',
  },
  not_found: {
    ar: 'لا يمكن الوصول إلى هذا السياق من هذه المحادثة.',
    en: 'This context cannot be reached from this conversation.',
  },
  engine_unavailable: {
    ar: 'تعذّر الوصول إلى محرك «أمين» الآن. أعد المحاولة بعد قليل.',
    en: 'The AMEEN engine could not be reached. Please try again shortly.',
  },
  failed: {
    ar: 'تعذّر إرسال الطلب إلى أمين.',
    en: 'The request to AMEEN could not be sent.',
  },
};

/** The membership refusal keeps its non-disclosing body and gains a readable reason. */
const MEMBERSHIP = {
  ar: 'لا تملك عضوية فعّالة في هذا النطاق، فلا يقرأ «أمين» محتوى لست طرفاً فيه.',
  en: 'You hold no active membership in this scope, so AMEEN cannot read content you are not party to.',
};

function refuse(code, status) {
  const copy = REFUSALS[code] || REFUSALS.failed;
  return Response.json({ error: copy.en, code, reason_ar: copy.ar, reason_en: copy.en }, { status });
}

function refuseRead(reason) {
  const body = refusalBody(reason);
  const copy = ['not_a_member', 'no_seat', 'out_of_scope', 'showcase_scope'].includes(reason)
    ? MEMBERSHIP
    : REFUSALS.failed;
  return Response.json({ ...body, reason_ar: copy.ar, reason_en: copy.en }, { status: refusalStatus(reason) });
}

export default async function (req) {
  let language = 'en';
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    if (!['ar', 'en'].includes(body?.language)) return refuse('invalid_request', 400);
    language = body.language;
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question || question.length > 6000 || typeof body.conversation_id !== 'string') {
      return refuse('invalid_request', 400);
    }

    // ── The principal: a registered account, or a verified exploration session ──
    const callerUser = await base44.auth.me().catch(() => null);
    const presentsSession = body.demo_mode === true
      || (typeof body.showcase_token === 'string' && body.showcase_token.trim() !== '');
    let principal;
    if (presentsSession) {
      principal = await resolvePrincipal({ sr, body, callerUser });
      if (principal.kind !== 'showcase') return refuse('no_session', 401);
    } else {
      if (!callerUser) return refuse('unauthenticated', 401);
      principal = { kind: 'user', user: callerUser };
    }

    // ── The conversation, read through the service role: the principal above is already the
    //    server's own verdict, and the binding checks below are what authorize THIS read.
    //    Reading it under the caller's own session is what made an exploration visitor's own
    //    conversation unreachable. ──
    let conversation = null;
    try {
      conversation = await sr.agents.getConversation(body.conversation_id);
    } catch {
      conversation = null;
    }
    if (!conversation || !conversation.metadata) return refuse('conversation_not_available', 404);

    const meta = conversation.metadata || {};
    if (typeof body.scope_key !== 'string' || meta.scope !== body.scope_key || meta.context_key !== body.context_key) {
      return refuse('not_found', 404);
    }
    if (meta.committee_id && meta.committee_id !== body.committee_id) return refuse('not_found', 404);
    if (meta.organization_id && meta.organization_id !== body.organization_id) return refuse('not_found', 404);
    if (body.committee_id) {
      const verdict = await authorizeRead({ base44, sr, principal, record: { committee_id: body.committee_id } });
      if (!verdict.allowed) return refuseRead(verdict.reason);
      const boundCommitteeRef = meta.scope.split('::')[3];
      if (!meta.committee_id && ![verdict.committee.id, verdict.committee.public_id, verdict.committee.slug].includes(boundCommitteeRef)) {
        return refuse('not_found', 404);
      }
    } else if (meta.committee_id || !['-', undefined].includes(meta.scope.split('::')[3])) {
      return refuse('not_found', 404);
    } else if (body.showcase_token && principal.kind !== 'showcase') {
      return refuse('no_session', 401);
    }

    // ── The locale is carried by the contract at the head of THIS message, and the recorded
    //    locale is an audit nicety beside it. The write is attempted only where the client's own
    //    SDK actually offers it: a missing helper must never cost a message. ──
    const localeChanged = meta.ui_locale !== language;
    if (localeChanged && typeof sr.agents.updateConversation === 'function') {
      const updatedMetadata = {
        ...meta,
        ui_locale: language,
        response_language: language,
        direction: language === 'ar' ? 'rtl' : 'ltr',
        locale_history: [
          ...(Array.isArray(meta.locale_history) ? meta.locale_history : []),
          { from: meta.ui_locale || null, to: language, at: new Date().toISOString() },
        ],
      };
      await sr.agents.updateConversation(conversation.id, { metadata: updatedMetadata }).catch(() => {});
      conversation.metadata = updatedMetadata;
    }

    const content = buildAmeenLanguageContract(language) + '\n' + question.replace(/\[\[\/?AMEEN-LOCALE\]\]/g, '');
    try {
      await sr.agents.addMessage(conversation, { role: 'user', content });
    } catch {
      return refuse('engine_unavailable', 503);
    }
    return Response.json({ ok: true, language, direction: language === 'ar' ? 'rtl' : 'ltr' });
  } catch (error) {
    return refuse('failed', 500);
  }
}