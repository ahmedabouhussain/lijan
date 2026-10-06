// ameenRetrievalGuard.ts — what must be TRUE before «أمين» is allowed to read a scope (ameen-retrieval-guard-1.0.0, D-092).
//
// Why this file exists. «أمين» reads across the platform on behalf of a person, and the platform already
// decides WHO that person is (ResolveAmeenContext) and HOW MUCH they may see (the classification
// ceiling). What was missing is the check that the authority it read is still ALIVE: three facts can end
// a scope without changing anything about the person's account —
//
//   1. the EXPLORATION SESSION was revoked or expired (the token is a capability, and a capability that
//      has been withdrawn must stop working immediately);
//   2. the SEAT ended — the term expired, the acting appointment lapsed, the seat was vacated — so the
//      standing the retrieval rested on is gone (the D-069 rule, applied to the assistant's own reads);
//   3. the SCOPE closed — a closed or archived committee is history, and history is read from the record,
//      not continued as an operating scope.
//
// The seat check is derived from the AUTHORITY kernel's own standing rule (`standingAt` over the seat's
// appointment events with the EFFECTIVE time), never re-implemented here: a second implementation of
// standing is exactly how two parts of a system come to disagree about who still holds a seat.
//
// Deny-only, and fail-closed: an unreadable or unknown standing is NOT treated as standing. A refusal
// names its code and its sentence in both languages, so a surface can say why instead of going quiet.

import { standingAt, loadAppointmentEvents, STANDING_STATES } from './membershipEffect.ts';
import { verifyShowcaseSession } from './showcaseSession.ts';

export const AMEEN_RETRIEVAL_GUARD_VERSION = 'ameen-retrieval-guard-1.0.0';

/** A committee in one of these states is history: its records are read, not operated in. */
export const SCOPE_NOT_IN_FORCE = ['closed', 'archived', 'suspended', 'cancelled', 'retired', 'rejected'];

export const RETRIEVAL_REFUSALS: Record<string, { ar: string; en: string }> = {
  session_revoked: { ar: 'جلسة العرض سُحبت، فلا تُقرأ بياناتها بعد اليوم.', en: 'The exploration session was revoked, so its data is no longer readable.' },
  session_expired: { ar: 'انتهت صلاحية جلسة العرض، فلا تُقرأ بياناتها.', en: 'The exploration session expired, so its data is no longer readable.' },
  session_invalid: { ar: 'جلسة العرض غير صالحة لهذا النطاق، والقراءة توقف.', en: 'The exploration session is not valid for this scope, and the read stops.' },
  scope_closed: { ar: 'اللجنة مغلقة أو مؤرشفة: تُقرأ سجلاتها من السجل، ولا يُستأنف العمل فيها كنطاق تشغيلي.', en: 'The committee is closed or archived: its records are read from the record, and it is not resumed as an operating scope.' },
  seat_ended: { ar: 'انتهت صفة المقعد التي استندت إليها القراءة، فلا تُبنى عليها.', en: 'The seat standing this read rested on has ended, so it cannot be built upon.' },
  seat_not_yet_started: { ar: 'مدة المقعد لم تبدأ بعد، فلا تُبنى عليها قراءة الآن.', en: 'The seat has not started yet, so no read rests on it now.' },
  standing_unknown: { ar: 'تعذّر إثبات قيام الصفة، ولا يُفترض القيام عند الجهل.', en: 'Standing could not be established, and standing is never assumed when unknown.' },
};

export const RETRIEVAL_GUARD_STATEMENTS = {
  deny_only: {
    ar: 'الحارس يمنع ولا يمنح: لا يوسّع نطاقًا ولا يرفع تصنيفًا، ولا يعمل إلا على ما مُنع.',
    en: 'The guard only denies: it never widens a scope and never raises a classification, and it acts only on what must stop.',
  },
  fail_closed: {
    ar: 'ما لا يُثبت قيامه ليس قائمًا: الجهل بحال المقعد يوقف القراءة ولا يُفسَّر قيامًا.',
    en: 'What cannot be established as standing is not standing: an unknown seat state stops the read rather than being read as in force.',
  },
  standing_from_one_contract: {
    ar: 'تُشتق الصفة من عقد وقت النفاذ نفسه (`membership-effect-1.0.0`)، فلا يوجد تعريف ثانٍ للقيام.',
    en: 'Standing is derived from the effective-time contract itself (`membership-effect-1.0.0`): there is no second definition of standing.',
  },
};

/** Is the scope live as an operating scope? A closed scope is history, not an active authority. */
export function assessScopeInForce(committee: any) {
  const status = String(committee?.status || '').toLowerCase();
  if (!status) return { live: false, code: 'standing_unknown', status: null };
  if (SCOPE_NOT_IN_FORCE.includes(status)) return { live: false, code: 'scope_closed', status };
  return { live: true, code: null, status };
}

/**
 * The caller's standing AT THIS INSTANT, from the seat's own appointment events — the authority kernel's
 * function, not a local re-decision. An unreadable seat list or an unknown state is a refusal.
 */
export async function assessSeatStanding(sr: any, { committee_id, user_id, at }: any) {
  if (!committee_id || !user_id) return { state: 'unknown', code: 'standing_unknown', seats: [], events_read: 0 };
  let seats: any[] = [];
  try {
    const rows = await sr.entities.CommitteeMembership.filter({ committee_id, user_id }, { limit: 20 });
    seats = Array.isArray(rows) ? rows : (rows?.items || []);
  } catch (e) {
    return { state: 'unknown', code: 'standing_unknown', seats: [], reason: (e as Error)?.message || 'seat read failed', events_read: 0 };
  }
  if (!seats.length) return { state: 'unknown', code: 'standing_unknown', seats: [], events_read: 0, reason: 'no seat found for this person in this committee' };

  let events: any[] = [];
  try {
    events = await loadAppointmentEvents(sr, seats.map((s: any) => s.id));
  } catch (e) {
    return { state: 'unknown', code: 'standing_unknown', seats: seats.map((s: any) => s.id), events_read: 0, reason: (e as Error)?.message || 'appointment events unreadable' };
  }

  const atInstant = at || new Date().toISOString();
  const states: string[] = [];
  for (const seat of seats) {
    let s: any = null;
    try {
      s = standingAt({ seat, events: events.filter((e: any) => e.membership_id === seat.id), at: atInstant });
    } catch (e) {
      s = null;
    }
    const state = s?.state && STANDING_STATES.includes(s.state) ? s.state : 'unknown';
    states.push(state);
    if (state === 'standing') {
      return { state: 'standing', code: null, seats: seats.map((x: any) => x.id), seat_id: seat.id, events_read: events.length, at: atInstant };
    }
  }
  const state = states.includes('ended') ? 'ended' : (states.includes('not_yet_started') ? 'not_yet_started' : 'unknown');
  const code = state === 'ended' ? 'seat_ended' : (state === 'not_yet_started' ? 'seat_not_yet_started' : 'standing_unknown');
  return { state, code, seats: seats.map((x: any) => x.id), events_read: events.length, at: atInstant };
}

/** The exploration session behind a token: revoked, expired and out-of-scope are three different refusals. */
export async function assessShowcaseSession(sr: any, token: string, committeeId: string | null) {
  if (!token) return { applicable: false, valid: false, code: null };
  let verdict: any = null;
  try {
    verdict = await verifyShowcaseSession(sr, token, committeeId ? { committeeId } : {});
  } catch (e) {
    return { applicable: true, valid: false, code: 'session_invalid', reason: (e as Error)?.message || 'session unverifiable' };
  }
  if (verdict?.valid === true || verdict?.ok === true) return { applicable: true, valid: true, code: null, session: verdict?.session || null };
  const reason = String(verdict?.reason || verdict?.code || 'invalid');
  const code = /revoke/i.test(reason) ? 'session_revoked' : (/expire|ttl/i.test(reason) ? 'session_expired' : 'session_invalid');
  return { applicable: true, valid: false, code, reason };
}

/** The single verdict the calling command consumes: ok, or the named refusals with their sentences. */
export function assessRetrieval({ scope, standing, session }: any) {
  const refusals: any[] = [];
  const record = (code: string, extra?: any) => {
    if (!code) return;
    refusals.push({ code, ar: RETRIEVAL_REFUSALS[code]?.ar || null, en: RETRIEVAL_REFUSALS[code]?.en || null, ...(extra || {}) });
  };
  if (session?.applicable && !session.valid) record(session.code || 'session_invalid', { reason: session.reason || null });
  if (scope && scope.live === false) record(scope.code || 'scope_closed', { scope_status: scope.status ?? null });
  if (standing && standing.state !== 'standing') record(standing.code || 'standing_unknown', { standing: standing.state, reason: standing.reason || null });

  return {
    contract_version: AMEEN_RETRIEVAL_GUARD_VERSION,
    ok: refusals.length === 0,
    refusals,
    codes: refusals.map((r) => r.code),
    checked: {
      session: !!session?.applicable,
      scope: !!scope,
      standing: !!standing,
    },
    at: new Date().toISOString(),
  };
}