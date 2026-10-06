// decisionLifecycle.ts — the ONE description of the decision state chain.
//
// CONTRACT VERSION: decision-lifecycle-1.1.0 (6 Oct 2026 — S1 slice 4).
// 1.1.0 adds the two steps the chain was missing — SUBMIT FOR REVIEW and START EXECUTION — and the
// states they write, so a decision no longer stops at issuance and `executing` (a state every register
// on the platform displays, and which NOTHING in this build could write) finally has a governed writer
// under its own right.
//
// Why this module exists (D-041, mandate §2 "known joins", reference R-17):
// the chain was declared in more than one place and the declarations disagreed —
//   • `CreateDecisionDraft` writes `draft`, and NOTHING in this build writes `proposed`.
//   • `OpenVote` accepted only `voting` or `proposed`, so a governed draft could never open a round:
//     the positive cycle draft → voting → approved → issued was UNREACHABLE, which is why no issued
//     package could exist and why G1 has no positive evidence.
//   • `IssueDecision` accepted seven states including `draft` and `proposed` while refusing with
//     "Decision must be approved before issuance" — so approval, issuance and effectiveness were not
//     distinguished, and the refusal text described a rule the code did not enforce.
//   • The UI advertised one vocabulary and the handlers enforced another.
//
// The rule this module states once:
//   1. A transition names the states it may act on, and every state it names is written by SOME
//      command in this build. A state no command produces must never be the only key to a transition.
//   2. Issuance requires `approved`. `approved`/`rejected` are produced by the vote result
//      (`CloseVote`) — they are not writable by a client and not reachable by a status edit.
//   3. Re-issuing an already issued/executing decision is IDEMPOTENT (a re-verification of the same
//      package), not a second issuance — the distinct answer is reported, not silently repeated.
//   4. Every refusal carries a code plus both Arabic and English text, so the surface that owns the
//      action can say why instead of failing quietly.
//   5. Sending a draft for review is its own act (`decision.submit`) performed by the office that
//      prepares it: submitting is neither proposing (`decision.propose`) nor reviewing
//      (`decision.review`). A reviewed draft can still be taken to a vote — the state this revision
//      introduces is not allowed to become a dead end, which is the very class of defect D-041 is about.
//   6. Starting execution is a governed transition over an ISSUED decision (`decision.execute`,
//      issued → executing). The right was named in the catalogue but no command exercised it, so the
//      platform displayed `executing` in its registers while nothing could produce it.
//
// This module reads no records and writes none: it is pure policy, so a test can assert against the
// same object every handler consumes.

export const DECISION_LIFECYCLE_VERSION = 'decision-lifecycle-1.1.0';

// States, and who writes each one (the writer is recorded here because an unwritten state was the
// defect: a transition keyed only to `proposed` could never fire).
export const DECISION_STATE = {
  DRAFT: 'draft',            // written by CreateDecisionDraft
  PROPOSED: 'proposed',      // legacy/imported records only — no command in this build writes it
  IN_REVIEW: 'in_review',    // written by TransitionDecision (submit_for_review)
  VOTING: 'voting',          // written by OpenVote
  APPROVED: 'approved',      // written by CloseVote (vote result)
  REJECTED: 'rejected',      // written by CloseVote (vote result)
  ISSUED: 'issued',          // written by IssueDecision
  EXECUTING: 'executing',    // written by TransitionDecision (start_execution), never by a status edit
  SUPERSEDED: 'superseded',  // written by a governed supersession
} as const;

// Transitions. `from` lists every state the transition may act on, INCLUDING legacy states that
// existing records may legitimately carry (`proposed`), so history is not orphaned by this contract.
export const DECISION_TRANSITIONS = {
  open_vote: {
    // in_review is listed deliberately: a reviewed draft must be able to go to a vote, otherwise the
    // state 1.1.0 introduces would be a dead end.
    from: [DECISION_STATE.DRAFT, DECISION_STATE.PROPOSED, DECISION_STATE.IN_REVIEW],
    to: DECISION_STATE.VOTING,
    capability: 'vote.call',
    note: 'a governed draft may be taken to a vote by the seat that holds the call right; proposing and agenda preparation stay distinct rights',
  },
  cast_vote: {
    from: [DECISION_STATE.VOTING],
    capability: 'vote.cast',
    note: 'a ballot exists only inside an open round',
  },
  close_vote: {
    from: [DECISION_STATE.VOTING],
    to: [DECISION_STATE.APPROVED, DECISION_STATE.REJECTED],
    capability: 'vote.close',
    note: 'the vote result is what produces approval — approval is not a status edit',
  },
  issue: {
    from: [DECISION_STATE.APPROVED],
    idempotent_from: [DECISION_STATE.ISSUED, DECISION_STATE.EXECUTING],
    to: DECISION_STATE.ISSUED,
    capability: 'decision.issue',
    note: 'issuance is a governed transition over an approved decision with a frozen round behind it',
  },
  // The two steps that had NO command. Each carries the right that fits the act rather than borrowing
  // one: sending a draft to review is not reviewing it, and starting execution is neither approving
  // nor issuing.
  submit_for_review: {
    from: [DECISION_STATE.DRAFT],
    to: DECISION_STATE.IN_REVIEW,
    capability: 'decision.submit',
    note: 'the drafting office advances its own draft; submitting is not proposing and not reviewing',
  },
  start_execution: {
    from: [DECISION_STATE.ISSUED],
    to: DECISION_STATE.EXECUTING,
    capability: 'decision.execute',
    note: 'execution begins on an issued decision by a governed transition, never by a status edit',
  },
};

const REFUSALS = {
  open_vote: {
    code: 'vote_cannot_open',
    ar: 'لا يُفتح التصويت في هذه الحالة؛ يُفتح على مشروع قرار مُنشأ بالأمر المحكوم.',
    en: 'Voting cannot be opened in this state; it is opened on a decision draft created by the governed command.',
  },
  cast_vote: {
    code: 'vote_not_open',
    ar: 'التصويت غير مفتوح على هذا القرار؛ لا يُسجَّل صوت.',
    en: 'Voting is not open on this decision; no ballot is recorded.',
  },
  close_vote: {
    code: 'vote_not_open',
    ar: 'لا توجد دورة تصويت مفتوحة لإغلاقها على هذا القرار.',
    en: 'There is no open voting round to close on this decision.',
  },
  issue: {
    code: 'decision_not_approved',
    ar: 'الإصدار لا يقع إلا على قرار معتمد؛ الاعتماد ينتج عن نتيجة التصويت ولا يُكتب من الواجهة.',
    en: 'Issuance applies only to an approved decision; approval follows from the vote result and is never written from the interface.',
  },
  submit_for_review: {
    code: 'decision_not_submittable',
    ar: 'لا يُرسل للمراجعة إلا مشروع قرار في حالة «مسودة»؛ وما هو قيد المراجعة أو التصويت لا يُعاد إرساله.',
    en: 'Only a decision draft can be sent for review; one already under review or in voting is not submitted again.',
  },
  start_execution: {
    code: 'decision_not_issued',
    ar: 'لا يبدأ التنفيذ إلا على قرار صادر؛ والإصدار نفسه يقع على قرار معتمد بنتيجة تصويت لا بتحرير حالة.',
    en: 'Execution begins only on an issued decision; issuance itself applies to an approved decision by vote result, never by a status edit.',
  },
  unknown_transition: {
    code: 'unknown_transition',
    ar: 'انتقال غير معروف في دورة حياة القرار.',
    en: 'Unknown decision-lifecycle transition.',
  },
};

const inList = (list: any, status: any) => Array.isArray(list) && list.includes(status);

export function decisionTransition(transition: string) {
  return (DECISION_TRANSITIONS as any)[transition] || null;
}

export function refusalFor(transition: string, status: any) {
  const base = (REFUSALS as any)[transition] || REFUSALS.unknown_transition;
  return {
    error: `Transition '${transition}' is not permitted from status '${status}'`,
    code: base.code,
    message: { ar: base.ar, en: base.en },
    current_status: status ?? null,
    lifecycle_policy_version: DECISION_LIFECYCLE_VERSION,
  };
}

export function canOpenVote(status: any) {
  return inList(DECISION_TRANSITIONS.open_vote.from, status);
}

export function canCastVote(status: any) {
  return inList(DECISION_TRANSITIONS.cast_vote.from, status);
}

export function canCloseVote(status: any) {
  return inList(DECISION_TRANSITIONS.close_vote.from, status);
}

// The two steps added in 1.1.0 read the SAME table as every other transition here, so the command's
// gate, the guard's state gate and the refusal text cannot describe three different rules.
export function canAdvanceDecision(status: any, transition: string) {
  const t = decisionTransition(transition);
  return !!t && inList(t.from, status);
}

// Issuance answers three ways, deliberately: permitted, idempotent (the same package re-verified), or
// refused with the reason. A boolean here would force the caller to lose the distinction between "you
// may issue" and "this is already issued", which is exactly the conflation this contract removes.
export function issuanceGate(status: any) {
  if (inList(DECISION_TRANSITIONS.issue.from, status)) return { allowed: true, idempotent: false, code: null };
  if (inList(DECISION_TRANSITIONS.issue.idempotent_from, status)) return { allowed: true, idempotent: true, code: 'already_issued' };
  return { allowed: false, idempotent: false, code: REFUSALS.issue.code };
}

// The chain, as the UI and the tests read it. `writable` names the command that produces each state,
// and `reachable` is derived: a state nothing writes must never be the ONLY entry to a transition.
export function decisionChain() {
  return [
    { state: DECISION_STATE.DRAFT, writable_by: 'CreateDecisionDraft', reachable: true },
    { state: DECISION_STATE.VOTING, writable_by: 'OpenVote', reachable: true },
    { state: DECISION_STATE.APPROVED, writable_by: 'CloseVote', reachable: true },
    { state: DECISION_STATE.REJECTED, writable_by: 'CloseVote', reachable: true },
    { state: DECISION_STATE.IN_REVIEW, writable_by: 'TransitionDecision', reachable: true },
    { state: DECISION_STATE.ISSUED, writable_by: 'IssueDecision', reachable: true },
    { state: DECISION_STATE.EXECUTING, writable_by: 'TransitionDecision', reachable: true },
    { state: DECISION_STATE.PROPOSED, writable_by: null, reachable: false, legacy: true },
  ];
}