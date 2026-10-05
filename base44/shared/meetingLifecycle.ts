// meetingLifecycle.ts — the ONE description of the AGENDA-ITEM and MINUTES state chains.
//
// CONTRACT VERSION: meeting-lifecycle-1.0.0 (5 Oct 2026 — S1 slice 3).
//
// Why this module exists (D-019, D-020, D-022, D-024):
//   • The agenda item stage (`pending → in_discussion → decided | deferred | withdrawn`) was written
//     FROM THE BROWSER, with no governed command and no server readiness gate.
//   • Removing an agenda item rode on the record's own administrative rule (`rls.delete` for an
//     organisation admin) — a deletion, not a governed act, and irreversible.
//   • Minutes content was written straight from the browser, and the minutes steps
//     (submit for review, issue to members, later amendment) had NO command at all, so they were
//     displayed disabled with a reason.
//   • Readiness was chosen by hand on the surface although `EvaluateAgendaReadiness` computes it.
//
// The rule this module states once:
//   1. Every transition names the states it may act on AND the capability the act requires, so the
//      right exercised is the right that fits the act (editing the agenda is not approving it).
//   2. No record is DELETED to remove it from an agenda: it is withdrawn, which keeps it auditable —
//      a governance record that can be deleted cannot be audited.
//   3. Minutes content is written only while the minutes can still be corrected (draft / in review),
//      never over an approved or issued record, and always through the governed command so the server
//      sanitises the stored text rather than trusting the browser.
//   4. Every refusal carries a code plus Arabic and English text.
//
// Pure policy: reads no records, writes none, so a test can assert the same object the commands use.

export const MEETING_LIFECYCLE_VERSION = 'meeting-lifecycle-1.0.0';

export const AGENDA_STATE = {
  PENDING: 'pending',
  IN_DISCUSSION: 'in_discussion',
  DECIDED: 'decided',
  DEFERRED: 'deferred',
  WITHDRAWN: 'withdrawn',
} as const;

export const MINUTES_STATE = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  ISSUED: 'issued',
  AMENDED: 'amended',
} as const;

// Agenda item transitions. `capability` is deliberate: beginning and deferring are acts of PREPARING
// the agenda (`agenda.edit`), while closing an item as DECIDED is an act of APPROVING it
// (`agenda.approve`) — the secretary prepares, the chair's authority closes.
export const AGENDA_TRANSITIONS = {
  begin_discussion: { from: [AGENDA_STATE.PENDING], to: AGENDA_STATE.IN_DISCUSSION, capability: 'agenda.edit' },
  decide: { from: [AGENDA_STATE.PENDING, AGENDA_STATE.IN_DISCUSSION], to: AGENDA_STATE.DECIDED, capability: 'agenda.approve' },
  defer: { from: [AGENDA_STATE.PENDING, AGENDA_STATE.IN_DISCUSSION], to: AGENDA_STATE.DEFERRED, capability: 'agenda.edit' },
} as const;

// Taking an item OFF the agenda is its own act rather than a stage change, and it is executed by
// ArchiveAgendaItem: the stage becomes 'withdrawn' and the RECORD IS KEPT. A governance record that
// can be deleted cannot be audited, so removal is a withdrawal that stays on the file.
export const AGENDA_ARCHIVE = {
  from: [AGENDA_STATE.PENDING, AGENDA_STATE.IN_DISCUSSION, AGENDA_STATE.DEFERRED],
  to: AGENDA_STATE.WITHDRAWN,
  capability: 'agenda.edit',
} as const;

// Minutes transitions. Preparation (`minutes.draft`) advances its own draft; RELEASING approved
// minutes to the members is its own right (`minutes.issue`), deliberately distinct from approving
// them (`minutes.approve`, held by ApproveMinutes); a later correction is a REVIEW-class act
// (`minutes.review`) and produces 'amended' — never an edit of an issued record in place.
export const MINUTES_TRANSITIONS = {
  submit_for_review: { from: [MINUTES_STATE.DRAFT], to: MINUTES_STATE.IN_REVIEW, capability: 'minutes.draft' },
  issue: { from: [MINUTES_STATE.APPROVED], to: MINUTES_STATE.ISSUED, capability: 'minutes.issue' },
  amend: { from: [MINUTES_STATE.APPROVED, MINUTES_STATE.ISSUED], to: MINUTES_STATE.AMENDED, capability: 'minutes.review' },
} as const;

// Content may be written only while the minutes can still be corrected. Approved and issued minutes
// are corrected by a NEW amendment, never by overwriting what was approved.
export const MINUTES_EDITABLE_STATES = [MINUTES_STATE.DRAFT, MINUTES_STATE.IN_REVIEW];

const REFUSALS = {
  agenda_item_not_found: {
    code: 'agenda_item_not_found',
    ar: 'بند الأجندة غير موجود.',
    en: 'The agenda item does not exist.',
  },
  agenda_transition_unknown: {
    code: 'agenda_transition_unknown',
    ar: 'انتقال غير معروف لمرحلة بند الأجندة.',
    en: 'Unknown agenda-item stage transition.',
  },
  agenda_transition_not_permitted: {
    code: 'agenda_transition_not_permitted',
    ar: 'لا يجوز هذا الانتقال من المرحلة الحالية للبند.',
    en: 'This transition is not permitted from the item’s current stage.',
  },
  minutes_transition_unknown: {
    code: 'minutes_transition_unknown',
    ar: 'انتقال غير معروف لمرحلة المحضر.',
    en: 'Unknown minutes transition.',
  },
  minutes_transition_not_permitted: {
    code: 'minutes_transition_not_permitted',
    ar: 'لا يجوز هذا الانتقال من حالة المحضر الحالية.',
    en: 'This transition is not permitted from the minutes’ current state.',
  },
  minutes_not_editable: {
    code: 'minutes_not_editable',
    ar: 'لا يُكتب فوق محضر معتمد أو صادر؛ التصحيح يكون بتعديل لاحق مرتبط بسجله.',
    en: 'Approved or issued minutes are never overwritten; a correction is a later amendment linked to its record.',
  },
  minutes_content_empty: {
    code: 'minutes_content_empty',
    ar: 'لا يوجد محتوى محضر صالح للحفظ.',
    en: 'There is no valid minutes content to save.',
  },
};

export function agendaTransition(name: string) {
  return (AGENDA_TRANSITIONS as any)[name] || null;
}

export function minutesTransition(name: string) {
  return (MINUTES_TRANSITIONS as any)[name] || null;
}

const inList = (list: any, value: any) => Array.isArray(list) && list.includes(value);

export function canAdvanceAgendaItem(stage: any, transition: string) {
  const t = agendaTransition(transition);
  return !!t && inList(t.from, stage);
}

export function canArchiveAgendaItem(stage: any) {
  return inList(AGENDA_ARCHIVE.from, stage);
}

export function archiveRefusal(stage: any) {
  return {
    error: `An agenda item in stage '${stage}' cannot be withdrawn`,
    code: 'agenda_item_not_withdrawable',
    message: {
      ar: 'لا يُسحب بند في مرحلته الحالية، ولا يُحذف بند من الأجندة إطلاقًا: السحب يُبقي السجل قابلًا للتدقيق.',
      en: 'An item in its current stage cannot be withdrawn, and an agenda item is never deleted: withdrawal keeps the record auditable.',
    },
    current_stage: stage ?? null,
    withdrawable_from: [...AGENDA_ARCHIVE.from],
    meeting_lifecycle_version: MEETING_LIFECYCLE_VERSION,
  };
}

export function canAdvanceMinutes(state: any, transition: string) {
  const t = minutesTransition(transition);
  return !!t && inList(t.from, state);
}

export function minutesEditable(state: any) {
  return inList(MINUTES_EDITABLE_STATES, state);
}

// Refusals are built from the SAME lists the gates above read, so the text can never disagree with
// the rule: what the message says is refused is exactly what the gate refuses.
export function agendaRefusal(transition: string, stage: any) {
  const t = agendaTransition(transition);
  const base = t ? REFUSALS.agenda_transition_not_permitted : REFUSALS.agenda_transition_unknown;
  return {
    error: `Transition '${transition}' is not permitted from agenda-item stage '${stage}'`,
    code: base.code,
    message: { ar: base.ar, en: base.en },
    current_stage: stage ?? null,
    permitted_from: t ? [...t.from] : null,
    meeting_lifecycle_version: MEETING_LIFECYCLE_VERSION,
  };
}

export function minutesRefusal(transition: string, state: any) {
  const t = minutesTransition(transition);
  const base = t ? REFUSALS.minutes_transition_not_permitted : REFUSALS.minutes_transition_unknown;
  return {
    error: `Transition '${transition}' is not permitted from minutes state '${state}'`,
    code: base.code,
    message: { ar: base.ar, en: base.en },
    current_state: state ?? null,
    permitted_from: t ? [...t.from] : null,
    meeting_lifecycle_version: MEETING_LIFECYCLE_VERSION,
  };
}

export function minutesContentRefusal(state: any) {
  return {
    error: `Minutes are not editable in state '${state}'`,
    code: REFUSALS.minutes_not_editable.code,
    message: { ar: REFUSALS.minutes_not_editable.ar, en: REFUSALS.minutes_not_editable.en },
    current_state: state ?? null,
    editable_states: [...MINUTES_EDITABLE_STATES],
    meeting_lifecycle_version: MEETING_LIFECYCLE_VERSION,
  };
}

// ── The chains as the surfaces and the tests read them ────────────────────────────────────────
// `writable_by` names the command that produces each stage/state, so a state nothing writes is
// visible here rather than discovered in production. `reachable` is derived from that.
export function agendaChain() {
  return [
    { stage: AGENDA_STATE.PENDING, writable_by: 'SubmitAgendaItem', reachable: true },
    { stage: AGENDA_STATE.IN_DISCUSSION, writable_by: 'TransitionAgendaItem', reachable: true },
    { stage: AGENDA_STATE.DECIDED, writable_by: 'TransitionAgendaItem', reachable: true },
    { stage: AGENDA_STATE.DEFERRED, writable_by: 'TransitionAgendaItem', reachable: true },
    { stage: AGENDA_STATE.WITHDRAWN, writable_by: 'ArchiveAgendaItem', reachable: true },
  ];
}

export function minutesChain() {
  return [
    { state: MINUTES_STATE.DRAFT, writable_by: 'GenerateMeetingMinutes', reachable: true },
    { state: MINUTES_STATE.IN_REVIEW, writable_by: 'TransitionMinutes', reachable: true },
    { state: MINUTES_STATE.APPROVED, writable_by: 'ApproveMinutes', reachable: true },
    { state: MINUTES_STATE.ISSUED, writable_by: 'TransitionMinutes', reachable: true },
    { state: MINUTES_STATE.AMENDED, writable_by: 'TransitionMinutes', reachable: true },
  ];
}