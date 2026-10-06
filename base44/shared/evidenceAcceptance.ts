// evidenceAcceptance.ts — LIJAN™ — ONE contract for accepting the evidence of an execution action.
//
// The defect this contract closes (D-046, brief §1/Stream D): closure rested on the owner's own
// word. Whatever a URL plus progress=100 asserted was written as `compliance_verified: true` by
// the very same act that closed the record — so there was no submission, no verdict, no accountable
// verifier, no way to send work back, and "verified" proved nothing except that someone holding the
// closure right believed the owner. The three acts are now separated and named here:
//
//   performance (the owner)      action.progress   → SUBMIT evidence   → verification_state: submitted
//   verification (a second seat) action.verify     → ACCEPT or RETURN  → accepted | returned
//   closure (accountable act)    action.close      → CLOSE            → only from accepted
//
// ONE table decides each step, and the command guard READS ITS STATE GATES FROM THIS TABLE (exactly
// as it reads the decision and meeting lifecycles), so a verdict and a closure can never disagree
// about what the record holds. Submitting is never verifying.

export const EVIDENCE_ACCEPTANCE_VERSION = 'evidence-acceptance-1.0.0';

export const VERIFICATION_STATES = ['not_submitted', 'submitted', 'returned', 'accepted'];

/** The action states a submission may start from — the performer's own act, before any verdict. */
const SUBMITTABLE_ACTION_STATES = [
  'assigned', 'in_progress', 'blocked', 'evidence_pending', 'under_review', 'overdue',
];

export const EVIDENCE_TRANSITIONS = {
  submit: {
    capability: 'action.progress',
    field: 'verification_state',
    from: ['not_submitted', 'returned'],
    to: 'submitted',
    action_states: SUBMITTABLE_ACTION_STATES,
    effect:
      'The performer submits evidence and the revision it belongs to. Nothing is verified by submitting: '
      + 'the action stays open, and an accepted verdict is never overwritten by a later upload.',
  },
  verdict: {
    capability: 'action.verify',
    field: 'verification_state',
    from: ['submitted'],
    accept: 'accepted',
    return: 'returned',
    // The verdict is an independent act: a seat may not judge evidence it submitted, and may not
    // judge evidence of an action it owns. This is the owner/verifier separation, declared once.
    independent_of: ['owner_user_id', 'evidence_submitted_by_user_id'],
    effect:
      'An accountable verifier accepts the submitted revision, or returns it with a stated reason so '
      + 'the owner can correct it and submit again as a new revision.',
  },
  close: {
    capability: 'action.close',
    field: 'verification_state',
    requires: 'accepted',
    effect:
      'Closure rests on an accepted verdict of the revision on the record — never on an assertion of '
      + 'completion, and never on an attachment by itself.',
  },
};

/** Accepting evidence is only meaningful for work reported as complete. */
export const ACCEPTANCE_REQUIRES_PROGRESS = 100;
export const RETURN_REASON_MIN_LENGTH = 5;
export const MAX_EVIDENCE_URL_LENGTH = 2048;

/**
 * The state gate each evidence command carries. `commandGuard` imports this table verbatim, so the
 * guard and the commands can never drift — the same single-sourcing that closed D-041.
 */
export const EVIDENCE_STATE_GATES = {
  'action.verify': { field: EVIDENCE_TRANSITIONS.verdict.field, states: [...EVIDENCE_TRANSITIONS.verdict.from] },
  'action.close': {
    field: EVIDENCE_TRANSITIONS.close.field,
    equals: EVIDENCE_TRANSITIONS.close.requires,
    code: 'closure_requires_acceptance',
  },
};

/** Seats that may NOT act on a record bound to themselves — the mirror of the owner binding. */
export const EVIDENCE_ACTOR_EXCLUDED = {
  'action.verify': [...EVIDENCE_TRANSITIONS.verdict.independent_of],
};

/** Bilingual refusals: the exact text a surface shows. A refusal is never swallowed. */
export const EVIDENCE_REFUSALS = {
  invalid_evidence_url: {
    status: 400,
    ar: 'رابط الدليل غير صالح: يجب أن يبدأ بـ http:// أو https://',
    en: 'The evidence reference is not a valid URL: it must start with http:// or https://',
  },
  return_reason_required: {
    status: 400,
    ar: `إعادة الدليل للتعديل تتطلب سببًا مكتوبًا (${RETURN_REASON_MIN_LENGTH} أحرف على الأقل)`,
    en: `Returning evidence for correction requires a stated reason (at least ${RETURN_REASON_MIN_LENGTH} characters)`,
  },
  not_a_verdict: {
    status: 400,
    ar: 'القرار غير معروف: القبول أو الإعادة فقط',
    en: 'Unknown verdict: only accept or return',
  },
  already_accepted: {
    status: 409,
    ar: 'الدليل مقبول من متحقّق مستقل: لا تُستبدل رقعة مُحكَّمة بتقديم جديد',
    en: 'The evidence is already accepted by an independent verifier: an accepted revision is never replaced by a new upload',
  },
  progress_incomplete: {
    status: 409,
    ar: 'لا يُقبل الدليل قبل أن يبلغ الإنجاز 100%',
    en: 'Evidence cannot be accepted before progress reaches 100%',
  },
  evidence_missing: {
    status: 409,
    ar: 'لا يوجد دليل مُقدَّم ليُحكم عليه',
    en: 'There is no submitted evidence to judge',
  },
  actor_not_independent: {
    status: 403,
    ar: 'التحقق من الدليل عمل مستقل: لا يجوز أن يتحقق مقدّم الدليل أو مالك الإجراء من دليله',
    en: 'Verifying evidence is an independent act: the submitter of the evidence and the owner of the action may not verify it',
  },
  closure_requires_acceptance: {
    status: 409,
    ar: 'الإغلاق يستند إلى قبول الدليل من متحقّق مستقل، لا إلى الإنجاز المُعلن',
    en: 'Closure rests on evidence accepted by an independent verifier, not on a reported completion',
  },
  action_not_open: {
    status: 409,
    ar: 'الإجراء مغلق أو مُتحقَّق منه نهائيًا',
    en: 'The action is already closed',
  },
};

/** One refusal shape for every evidence command: code + status + both languages. */
export function refusal(code, extra: Record<string, any> = {}) {
  const r = EVIDENCE_REFUSALS[code] || {
    status: 409, ar: 'الطلب غير مسموح على هذه السجل', en: 'This act is not permitted on this record',
  };
  return { code, status: r.status, reason: r.en, reason_ar: r.ar, contract_version: EVIDENCE_ACCEPTANCE_VERSION, ...extra };
}

export function isVerificationState(value: any) {
  return VERIFICATION_STATES.includes(value);
}