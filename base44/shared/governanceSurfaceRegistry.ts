// governanceSurfaceRegistry.ts — G-1: THE register of governed surfaces (governance-surfaces-1.0.0).
//
// Why this file exists. Twice in this build a surface advertised an act the platform could not perform:
// a button gated on the wrong capability (D-042), and closure offered where no governed path existed
// (D-048). Each was found by reading one file at a time. This registry makes the whole surface
// inventory readable at once, with FOUR facts stated for every surface, so a mismatch is a FAILING
// SELF-CHECK instead of a discovery:
//
//   1. the CAPABILITY that governs the act,
//   2. the COMMAND that performs it (there is no surface that performs an act itself),
//   3. the CONTRACT that gates its state, when the act is state-gated,
//   4. what the surface SHOWS WHEN THE ACT IS UNAVAILABLE — an unavailable class with its own bilingual
//      sentence, never a silent dead button.
//
// Two honesty fields are mandatory, and the self-check refuses to let them lie:
//   • `capability_source`: 'verified' (re-derived from the command in this pass) or 'unverified' (named
//     as a work item — the registry counts its own gaps instead of implying completeness).
//   • `recorded_path` + `recorded_path_evidence`: whether the surface was ever exercised over a
//     PERSISTED record, and the correlation id that proves it. Coherence is enforced: acceptance cannot
//     be claimed without a recorded path, and a surface that HAS recorded proof cannot claim blocked.
//
// The registry reads no records and writes none: it is a declaration, consumed by the governed read
// `GetGovernanceSurfaces` and by `TestGovernanceSurfaces`.

export const GOVERNANCE_SURFACES_VERSION = "governance-surfaces-1.0.0";

export const SURFACE_STAGES: Record<string, { ar: string; en: string }> = {
  people: { ar: "الأشخاص والتشكيل", en: "People and formation" },
  meetings: { ar: "الاجتماعات والأجندة", en: "Meetings and agenda" },
  decisions: { ar: "القرارات والتصويت والتمرير", en: "Decisions, voting and circulation" },
  records: { ar: "السجلات والمستندات", en: "Records and documents" },
  execution: { ar: "التنفيذ والمتابعة", en: "Execution and follow-up" },
  oversight: { ar: "الرقابة والإغلاق", en: "Oversight and closure" },
};

/** What the surface shows when the act cannot be performed. One sentence per class, stated once. */
export const UNAVAILABLE_CLASSES: Record<string, { ar: string; en: string }> = {
  authority: {
    ar: "تُعرض الخطوة معطّلة، ويُسمّى الحقّ المطلوب بدقة: لا تفويض لك بهذا الفعل في هذه اللجنة.",
    en: "The step is shown disabled and names the exact right required: this act is not within your authority in this committee.",
  },
  state: {
    ar: "تُعرض الخطوة معطّلة، ويُسمّى الانتقال المطلوب وحالة السجل القائمة التي تمنعه.",
    en: "The step is shown disabled and names the transition required and the record's current state that prevents it.",
  },
  no_command: {
    ar: "تُعرض الخطوة معطّلة، ويُعلن صراحةً أنه لا يوجد أمر خادمي محكوم ينفّذها بعد — ولا يُكتب شيء من المتصفح.",
    en: "The step is shown disabled and states plainly that no governed server command performs it yet — nothing is ever written from the browser.",
  },
  not_seated: {
    ar: "تُعرض الخطوة متاحة، لكن تنفيذها يستلزم جلسة فاعل مُقعد مُصادَق؛ والدليل المتوفر عقوديّ فقط حتى تُوفَّر الجلسة.",
    en: "The step is offered, but performing it requires an authorized seated actor; the available evidence is contractual until that session exists.",
  },
  unverified: {
    ar: "تُعرض الخطوة معطّلة، ويُعلن أن حقّها لم يُعد اشتقاقه في هذه الجولة — فالسجل يسمّي نقصه ولا يدّعي ما لا يستطيع إثباته.",
    en: "The step is shown disabled and states that its right was not re-derived in this pass — the register names its gap instead of claiming what it cannot show.",
  },
};

export const ACTOR_BINDINGS: Record<string, { ar: string; en: string }> = {
  none: { ar: "غير مقيَّد بهوية", en: "Not bound to an identity" },
  own_record: { ar: "مقيَّد بأن الفاعل صاحب السجل", en: "Bound: the actor owns the record" },
  identity: { ar: "مقيَّد بهوية الفاعل على السجل (على كل دور)", en: "Bound to the actor's own identity on the record (every role)" },
  independent: { ar: "مقيَّد بأن الفاعل مستقل عن صاحب الشأن", en: "Bound: the actor must be independent of the party concerned" },
};

export const EVIDENCE_STATUSES: Record<string, { ar: string; en: string }> = {
  contract_verified: { ar: "متحقَّق عقوديًا بأسرة اختبار مسجَّلة", en: "Contract-verified by a recorded test suite" },
  partial: { ar: "جزئي: بعض مساره محفوظ أو بعض عقده لم يُختبَر", en: "Partial: part of its path is persisted, or part of its contract is untested" },
  not_assessed: { ar: "لم يُقيَّم في هذه المرحلة — مُعلن لا مُفترض", en: "Not assessed in this pass — declared, never assumed" },
};

type Surface = {
  id: string; ar: string; en: string; stage: string; kind: "act" | "view";
  capability: string; capability_source: "verified" | "unverified";
  command: string; command_source?: "verified" | "unverified";
  contract: string | null; gated?: boolean; state_from?: string;
  actor_binding?: string; bound_field?: string;
  route: string | null; route_file?: string;
  unavailable: string; evidence: string; suite?: string;
  recorded_path?: boolean; recorded_path_evidence?: string | null;
  note_ar?: string; note_en?: string;
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE REGISTRY. Capability and command are declared with their SOURCE, because a register that
// overstates its own verification is worth nothing.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
export const GOVERNANCE_SURFACES: Surface[] = [
  // ── People and formation ────────────────────────────────────────────────────────────────────────
  { id: "record_appointment_event", ar: "تسجيل حدث تعيين أو انتهاء", en: "Record an appointment or ending event", stage: "people", kind: "act",
    capability: "committee.manage", capability_source: "verified", command: "RecordAppointmentEvent", contract: "continuity-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/appointments", route_file: "src/pages/committee/CommitteeAppointments.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestContinuityContract", recorded_path: false, recorded_path_evidence: null },
  { id: "resign_own_seat", ar: "الاستقالة من المقعد", en: "Resign from the seat", stage: "people", kind: "act",
    capability: "seat.resign", capability_source: "verified", command: "RecordAppointmentEvent", contract: "continuity-1.0.0",
    actor_binding: "identity", bound_field: "user_id", route: "/o/:orgRef/c/:committeeRef/appointments", route_file: "src/pages/committee/CommitteeAppointments.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestContinuityContract", recorded_path: false, recorded_path_evidence: null,
    note_ar: "فعل شخصي: لا يمارسه منصب على مقعد غيره، ولا الرئيس عن عضو.", note_en: "A personal act: no office performs it for another seat, including the chair." },
  { id: "initiate_handover", ar: "بدء التسليم للخلف", en: "Initiate a handover", stage: "people", kind: "act",
    capability: "committee.manage", capability_source: "verified", command: "InitiateHandover", contract: "continuity-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/handover", route_file: "src/pages/committee/CommitteeHandover.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestContinuityContract", recorded_path: false, recorded_path_evidence: null },
  { id: "accept_handover", ar: "قبول التسليم", en: "Accept a handover", stage: "people", kind: "act",
    capability: "seat.handover_accept", capability_source: "verified", command: "AcceptHandover", contract: "continuity-1.0.0",
    actor_binding: "identity", bound_field: "successor_user_id", route: "/o/:orgRef/c/:committeeRef/handover", route_file: "src/pages/committee/CommitteeHandover.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestContinuityContract", recorded_path: false, recorded_path_evidence: null },
  { id: "record_recusal", ar: "تسجيل التنحّي", en: "Record a recusal", stage: "people", kind: "act",
    capability: "read", capability_source: "verified", command: "RecordRecusal", contract: "authz-1.10.0",
    actor_binding: "identity", bound_field: "member_user_id", route: "/o/:orgRef/c/:committeeRef/recusals", route_file: "src/pages/committee/CommitteeRecusals.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestAuthorizationGuard", recorded_path: false, recorded_path_evidence: null,
    note_ar: "إعلان المُقعد عن نفسه: يُقبل بحق القراءة على اللجنة وحدها، ولا يُوسَّع لغيره.", note_en: "A seated person's declaration about themselves: accepted on the read right over the committee alone, and never widened to another." },
  { id: "declare_conflict", ar: "الإفصاح عن تضارب مصالح", en: "Declare a conflict of interest", stage: "people", kind: "act",
    capability: "read", capability_source: "verified", command: "DeclareConflict", contract: "authz-1.10.0",
    actor_binding: "identity", bound_field: "declared_by_user_id", route: "/o/:orgRef/c/:committeeRef/recusals", route_file: "src/pages/committee/CommitteeRecusals.jsx",
    unavailable: "authority", evidence: "not_assessed", recorded_path: false, recorded_path_evidence: null },

  // ── Meetings and agenda ─────────────────────────────────────────────────────────────────────────
  { id: "create_meeting", ar: "إنشاء اجتماع", en: "Create a meeting", stage: "meetings", kind: "act",
    capability: "meeting.schedule", capability_source: "verified", command: "CreateMeeting", contract: "meeting-lifecycle-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/meetings", route_file: "src/pages/committee/hubs/MeetingsHub.jsx",
    unavailable: "authority", evidence: "not_assessed", recorded_path: false, recorded_path_evidence: null },
  { id: "start_meeting", ar: "بدء الاجتماع", en: "Start the meeting", stage: "meetings", kind: "act",
    capability: "meeting.start", capability_source: "verified", command: "StartMeeting", contract: "meeting-lifecycle-1.0.0",
    gated: true, state_from: "scheduled", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/meetings/:id", route_file: "src/pages/MeetingDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestAuthorizationGuard", recorded_path: false, recorded_path_evidence: null },
  { id: "adjourn_meeting", ar: "تأجيل الاجتماع", en: "Adjourn the meeting", stage: "meetings", kind: "act",
    capability: "meeting.adjourn", capability_source: "verified", command: "AdjournMeeting", contract: "meeting-lifecycle-1.0.0",
    gated: true, state_from: "in_progress", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/meetings/:id", route_file: "src/pages/MeetingDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestAuthorizationGuard", recorded_path: false, recorded_path_evidence: null },
  { id: "cancel_meeting", ar: "إلغاء الاجتماع", en: "Cancel the meeting", stage: "meetings", kind: "act",
    capability: "meeting.cancel", capability_source: "verified", command: "CancelMeeting", contract: "meeting-lifecycle-1.0.0",
    gated: true, state_from: "scheduled | in_progress", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/meetings/:id", route_file: "src/pages/MeetingDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestAuthorizationGuard", recorded_path: false, recorded_path_evidence: null },
  { id: "propose_agenda_item", ar: "اقتراح بند أجندة", en: "Propose an agenda item", stage: "meetings", kind: "act",
    capability: "agenda.propose", capability_source: "verified", command: "SubmitAgendaItem", contract: "meeting-lifecycle-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/agenda", route_file: "src/pages/committee/CommitteeAgenda.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestAuthorizationGuard", recorded_path: false, recorded_path_evidence: null },
  { id: "transition_agenda_item", ar: "بدء مناقشة البند أو تأجيله", en: "Begin discussion or defer an item", stage: "meetings", kind: "act",
    capability: "agenda.edit", capability_source: "verified", command: "TransitionAgendaItem", contract: "meeting-lifecycle-1.0.0",
    gated: true, state_from: "pending | in_discussion", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/meetings/:id", route_file: "src/pages/MeetingDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestMeetingLifecycle", recorded_path: false, recorded_path_evidence: null },
  { id: "decide_agenda_item", ar: "إقرار البند", en: "Decide an agenda item", stage: "meetings", kind: "act",
    capability: "agenda.approve", capability_source: "verified", command: "TransitionAgendaItem", contract: "meeting-lifecycle-1.0.0",
    gated: true, state_from: "in_discussion", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/meetings/:id", route_file: "src/pages/MeetingDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestMeetingLifecycle", recorded_path: false, recorded_path_evidence: null },
  { id: "archive_agenda_item", ar: "سحب بند الأجندة", en: "Withdraw an agenda item", stage: "meetings", kind: "act",
    capability: "agenda.edit", capability_source: "verified", command: "ArchiveAgendaItem", contract: "meeting-lifecycle-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/meetings/:id", route_file: "src/pages/MeetingDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestMeetingLifecycle", recorded_path: false, recorded_path_evidence: null,
    note_ar: "البند يُسحب ويبقى سجله: لا حذف في نظام حوكمة.", note_en: "The item is withdrawn and its record stays: nothing is deleted in a governance system." },
  { id: "certify_attendance", ar: "اعتماد الحضور والنصاب", en: "Certify attendance and quorum", stage: "meetings", kind: "act",
    capability: "attendance.certify", capability_source: "verified", command: "CertifyAttendance", contract: "meeting-lifecycle-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/attendance", route_file: "src/pages/committee/CommitteeAttendance.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestAuthorizationGuard", recorded_path: false, recorded_path_evidence: null },
  { id: "prepare_minutes", ar: "تحرير محتوى المحضر", en: "Prepare the minutes content", stage: "meetings", kind: "act",
    capability: "minutes.draft", capability_source: "verified", command: "PrepareMinutes", contract: "meeting-lifecycle-1.0.0",
    gated: true, state_from: "draft | in_review", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/minutes", route_file: "src/pages/committee/CommitteeMinutes.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestMeetingLifecycle", recorded_path: false, recorded_path_evidence: null,
    note_ar: "التعقيم يجري على الخادم، ولا تُقبل كتابة إلا في مسودة أو مراجعة.", note_en: "Sanitisation runs server-side, and writing is accepted only in draft or review." },
  { id: "issue_minutes", ar: "إصدار المحضر", en: "Issue the minutes", stage: "meetings", kind: "act",
    capability: "minutes.issue", capability_source: "verified", command: "TransitionMinutes", contract: "meeting-lifecycle-1.0.0",
    gated: true, state_from: "in_review", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/minutes", route_file: "src/pages/committee/CommitteeMinutes.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestMeetingLifecycle", recorded_path: false, recorded_path_evidence: null,
    note_ar: "حق الإصدار مستقل عن الاعتماد.", note_en: "The issue right is independent of approval." },
  { id: "approve_minutes", ar: "اعتماد المحضر", en: "Approve the minutes", stage: "meetings", kind: "act",
    capability: "minutes.approve", capability_source: "verified", command: "ApproveMinutes", contract: "meeting-lifecycle-1.0.0",
    gated: true, state_from: "draft | in_review", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/minutes", route_file: "src/pages/committee/CommitteeMinutes.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestAuthorizationGuard", recorded_path: false, recorded_path_evidence: null },
  { id: "invite_agenda_guest", ar: "دعوة ضيف إلى بند", en: "Invite a guest to an item", stage: "meetings", kind: "act",
    capability: "agenda.edit", capability_source: "verified", command: "InviteAgendaItemGuest", contract: "guest-access-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/meetings/:id", route_file: "src/components/raqeem/AgendaGuestPanel.jsx",
    unavailable: "authority", evidence: "partial", suite: "TestGuestAccess", recorded_path: false, recorded_path_evidence: null,
    note_ar: "القراءة العامة بالرمز والإلغاء أُغلقا محفوظين (D-065)؛ وإصدار الدعوة نفسه لم يُمَارس.", note_en: "Token read and revocation were closed over persisted records (D-065); issuing the invitation itself was not exercised." },
  { id: "view_guest_item", ar: "عرض الضيف للبند", en: "Guest view of the item", stage: "meetings", kind: "view",
    capability: "none", capability_source: "verified", command: "GetGuestItemView", contract: "guest-access-1.0.0",
    actor_binding: "none", route: "/guest/:token", route_file: "src/pages/GuestItemView.jsx",
    unavailable: "not_seated", evidence: "partial", suite: "TestGuestAccess", recorded_path: true, recorded_path_evidence: "E-S16-001",
    note_ar: "الرمز هو القدرة: لا حساب ولا دور. والملفات تبقى فجوة مُعلنة (D-059).", note_en: "The token is the capability: no account and no role. File bytes remain a declared gap (D-059)." },

  // ── Decisions, voting and circulation ───────────────────────────────────────────────────────────
  { id: "create_decision_draft", ar: "إنشاء مشروع قرار", en: "Create a decision draft", stage: "decisions", kind: "act",
    capability: "decision.propose", capability_source: "verified", command: "CreateDecisionDraft", contract: "decision-lifecycle-1.1.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/meetings/:id", route_file: "src/pages/MeetingDetail.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestAuthorizationGuard", recorded_path: false, recorded_path_evidence: null,
    note_ar: "حُسم في D-033: الاقتراح حقّه `decision.propose` لا `agenda.propose`.", note_en: "Settled in D-033: proposing rests on `decision.propose`, not `agenda.propose`." },
  { id: "submit_decision_for_review", ar: "إرسال مشروع القرار للمراجعة", en: "Send the draft for review", stage: "decisions", kind: "act",
    capability: "decision.submit", capability_source: "verified", command: "TransitionDecision", contract: "decision-lifecycle-1.1.0",
    gated: true, state_from: "draft", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/pages/DecisionDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestDecisionLifecycle", recorded_path: false, recorded_path_evidence: null },
  { id: "open_vote", ar: "فتح التصويت", en: "Open voting", stage: "decisions", kind: "act",
    capability: "vote.call", capability_source: "verified", command: "OpenVote", contract: "proposal-content-1.0.0",
    gated: true, state_from: "draft | proposed | in_review", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/pages/DecisionDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestProposalContent", recorded_path: false, recorded_path_evidence: null,
    note_ar: "فتح الدورة يجمّد نص المقترح ببصمته؛ وهيئة ناخبة صفرية توقف الفتح (409).", note_en: "Opening the round freezes the voted text by digest; a zero electorate stops the opening (409)." },
  { id: "cast_vote", ar: "تسجيل الصوت", en: "Cast a ballot", stage: "decisions", kind: "act",
    capability: "vote.cast", capability_source: "verified", command: "CastVote", contract: "proposal-content-1.0.0",
    gated: true, state_from: "voting", actor_binding: "identity", bound_field: "seat_id (the seat is not the person)",
    route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/pages/DecisionDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestProposalContent", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الرفض يشمل: لا دورة مجمّدة · نص متغيّر · مقعد خارج الدورة · تكرار في الدورة.", note_en: "Refusals include: no frozen round · stale text · seat outside the round · a repeat in the same round." },
  { id: "certify_vote", ar: "تصديق النتيجة", en: "Certify the result", stage: "decisions", kind: "act",
    capability: "vote.certify", capability_source: "verified", command: "CloseVote", contract: "decision-lifecycle-1.1.0",
    gated: true, state_from: "voting", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/pages/DecisionDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestDecisionLifecycle", recorded_path: false, recorded_path_evidence: null },
  { id: "issue_decision", ar: "إصدار القرار", en: "Issue the decision", stage: "decisions", kind: "act",
    capability: "decision.issue", capability_source: "verified", command: "IssueDecision", contract: "decision-integrity-1.2.0",
    gated: true, state_from: "approved", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/pages/DecisionDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestDecisionIntegrity", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الإصدار يقرأ الدورة التي جُمِّدت فعليًا، ويوقف عند تعدد الدورات أو غياب دورة مجمّدة.", note_en: "Issuance reads the round actually frozen, and stops on multiple rounds or a missing frozen round." },
  { id: "start_execution", ar: "بدء التنفيذ", en: "Start execution", stage: "decisions", kind: "act",
    capability: "decision.execute", capability_source: "verified", command: "TransitionDecision", contract: "decision-lifecycle-1.1.0",
    gated: true, state_from: "issued", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/pages/DecisionDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestDecisionLifecycle", recorded_path: false, recorded_path_evidence: null },
  { id: "set_circulation_policy", ar: "تقرير سياسة القرار بالتمرير", en: "Set the circulation policy", stage: "decisions", kind: "act",
    capability: "committee.manage", capability_source: "verified", command: "SetCirculationPolicy", contract: "circulation-approval-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/pages/DecisionDetail.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestCirculationApproval", recorded_path: false, recorded_path_evidence: null,
    note_ar: "المسار لا يُفتح إلا على سياسة مكتوبة في سجل اللجنة، ولا يُدَّعى نطاق يُخالف سياسة التصويت.", note_en: "The route opens only on a policy written in the committee's own record, and never on a scope wider than voting policy allows." },
  { id: "get_principal_basis", ar: "قراءة أساس التصويت عند تعدد المقاعد", en: "Read the voting basis where a person holds more than one seat", stage: "decisions", kind: "view",
    capability: "read", capability_source: "verified", command: "GetPrincipalBasis", contract: "principal-representation-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/governance-rules", route_file: "src/pages/committee/CommitteeGovernanceRules.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestPrincipalRepresentation", recorded_path: false, recorded_path_evidence: null,
    note_ar: "يقرأ الأساس المسجَّل في سجل اللجنة، وأثره اليوم: المقاعد المؤهلة · الأصوات · من يحمل أكثر من مقعد · وهل النصاب قابل للبلوغ.", note_en: "Reads the basis recorded on the committee's own record and what it means today: eligible seats, votes, who holds more than one seat, and whether the quorum is reachable." },
  { id: "set_principal_basis", ar: "تسجيل أساس التصويت عند تعدد المقاعد", en: "Record the voting basis where a person holds more than one seat", stage: "decisions", kind: "act",
    capability: "committee.manage", capability_source: "verified", command: "SetPrincipalBasis", contract: "principal-representation-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/governance-rules", route_file: "src/pages/committee/CommitteeGovernanceRules.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestPrincipalRepresentation", recorded_path: false, recorded_path_evidence: null,
    note_ar: "هل يحمل الشخص ذو المقعدين صوتين أم صوتًا واحدًا قرارُ المؤسسة: يُقرأ من سجلها ولا يُفترض، ويتوقف الفعل المتأثر وحده حتى يُسجَّل.", note_en: "Whether a dual-seat person carries two votes or one is the institution's own decision: read from its record, never assumed, and only the affected act stops until it is recorded." },
  { id: "open_circulation", ar: "إرسال دورة التمرير", en: "Dispatch a circulation round", stage: "decisions", kind: "act",
    capability: "circulation.open", capability_source: "verified", command: "OpenCirculation", contract: "circulation-approval-1.0.0",
    gated: true, state_from: "decision open states", actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/pages/DecisionDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestCirculationApproval", recorded_path: false, recorded_path_evidence: null },
  { id: "respond_circulation", ar: "الرد على التمرير", en: "Respond to the circulation", stage: "decisions", kind: "act",
    capability: "circulation.respond", capability_source: "verified", command: "RecordCirculationResponse", contract: "circulation-approval-1.0.0",
    actor_binding: "identity", bound_field: "seat_id + user_id", route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/pages/DecisionDetail.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestCirculationApproval", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الصمت لا يُحتسب موافقة، وردّ ثانٍ من المقعد نفسه يُرفض.", note_en: "Silence is never counted as approval, and a second response from the same seat is refused." },
  { id: "finalize_circulation", ar: "إنتاج نتيجة التمرير", en: "Finalize the circulation outcome", stage: "decisions", kind: "act",
    capability: "circulation.finalize", capability_source: "verified", command: "FinalizeCirculation", contract: "circulation-approval-1.0.0",
    gated: true, state_from: "collecting | ready", actor_binding: "independent", bound_field: "dispatch_authorized_by_user_id",
    route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/pages/DecisionDetail.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestCirculationApproval", recorded_path: false, recorded_path_evidence: null,
    note_ar: "من أرسل الدورة لا ينتج نتيجتها إلا إذا نصّت سياسة اللجنة على خلاف ذلك.", note_en: "Whoever dispatched the round does not produce its outcome unless the committee's policy provides otherwise." },

  // ── Records and documents ───────────────────────────────────────────────────────────────────────
  { id: "annotate_document", ar: "تدوين ملاحظة على مستند", en: "Annotate a document", stage: "records", kind: "act",
    capability: "document.annotate", capability_source: "verified", command: "AnnotateDocument", contract: "annotation-continuity-1.0.0",
    gated: true, state_from: "document version in force", actor_binding: "identity", bound_field: "author_user_id",
    route: "/o/:orgRef/c/:committeeRef/documents/:documentId", route_file: "src/pages/committee/DocumentDetail.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestAnnotationContinuity", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الملاحظة تُكتب على الإصدار النافذ فقط، والمقطع المقتبس يُبصَّم بعد تطبيع عربي.", note_en: "A note is written on the version in force only, and the quoted passage is fingerprinted after Arabic normalisation." },
  { id: "carry_forward_note", ar: "نقل الملاحظة إلى الإصدار الأحدث", en: "Carry a note forward", stage: "records", kind: "act",
    capability: "annotation.own", capability_source: "verified", command: "AnnotateDocument", contract: "annotation-continuity-1.0.0",
    actor_binding: "identity", bound_field: "author_user_id", route: "/o/:orgRef/c/:committeeRef/documents/:documentId", route_file: "src/components/raqeem/annotations/DocumentAnnotationsPanel.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestAnnotationContinuity", recorded_path: false, recorded_path_evidence: null,
    note_ar: "النقل فعل الكاتب وحده، ويُنشئ سجلًا جديدًا مرتبطًا بالأصل؛ والملاحظة الخاصة لا تُورَّث في التسليم.", note_en: "Carrying forward is the author's act alone and creates a new linked record; a private note is never inherited in a handover." },
  { id: "upload_document_version", ar: "إصدار نسخة مستند", en: "Upload a document version", stage: "records", kind: "act",
    capability: "agenda.edit", capability_source: "verified", command: "UploadDocumentVersion", contract: null,
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/documents", route_file: "src/pages/committee/CommitteeDocuments.jsx",
    unavailable: "authority", evidence: "not_assessed", recorded_path: false, recorded_path_evidence: null },
  { id: "publish_meeting_pack", ar: "نشر حزمة الاجتماع", en: "Publish the meeting pack", stage: "records", kind: "act",
    capability: "agenda.edit", capability_source: "verified", command: "PublishMeetingPack", contract: null,
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/packs", route_file: "src/pages/committee/CommitteePacks.jsx",
    unavailable: "authority", evidence: "not_assessed", recorded_path: false, recorded_path_evidence: null },

  // ── Execution and follow-up ─────────────────────────────────────────────────────────────────────
  { id: "record_action_progress", ar: "تحديث تقدّم الإجراء", en: "Record action progress", stage: "execution", kind: "act",
    capability: "action.progress", capability_source: "verified", command: "UpdateActionProgress", contract: "evidence-acceptance-1.0.0",
    gated: true, state_from: "assigned | in_progress | blocked | evidence_pending | under_review | overdue",
    actor_binding: "own_record", bound_field: "owner_user_id", route: "/o/:orgRef/c/:committeeRef/actions", route_file: "src/pages/committee/CommitteeActions.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestEvidenceAcceptance", recorded_path: false, recorded_path_evidence: null },
  { id: "submit_action_evidence", ar: "تقديم دليل الإجراء", en: "Submit action evidence", stage: "execution", kind: "act",
    capability: "action.progress", capability_source: "verified", command: "SubmitActionEvidence", contract: "evidence-acceptance-1.0.0",
    actor_binding: "own_record", bound_field: "owner_user_id", route: "/o/:orgRef/c/:committeeRef/actions", route_file: "src/components/raqeem/ActionEvidencePanel.jsx",
    unavailable: "authority", evidence: "partial", suite: "TestEvidenceAcceptance", recorded_path: false, recorded_path_evidence: null,
    note_ar: "التقديم ليس قبولًا: القبول حكم مستقل.", note_en: "Submission is not acceptance: acceptance is a separate verdict." },
  { id: "review_action_evidence", ar: "الحكم على دليل الإجراء", en: "Judge the action evidence", stage: "execution", kind: "act",
    capability: "action.verify", capability_source: "verified", command: "ReviewActionEvidence", contract: "evidence-acceptance-1.0.0",
    actor_binding: "independent", bound_field: "evidence_submitted_by_user_id + owner_user_id",
    route: "/o/:orgRef/c/:committeeRef/execution", route_file: "src/pages/committee/hubs/ExecutionHub.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestEvidenceAcceptance", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الاستقلال على كل دور: من قدّم الدليل أو يملك الإجراء لا يحكم عليه، ولا الرئيس إن كان صاحب الإجراء.", note_en: "Independence holds for every role: the submitter and the action owner never judge it, chair included." },
  { id: "close_action", ar: "إغلاق الإجراء", en: "Close the action", stage: "execution", kind: "act",
    capability: "action.close", capability_source: "verified", command: "CloseAction", contract: "evidence-acceptance-1.0.0",
    gated: true, state_from: "verified (after an accepted verdict)", actor_binding: "independent", bound_field: "verified_by_user_id (the accepted verdict)",
    route: "/o/:orgRef/c/:committeeRef/actions", route_file: "src/pages/committee/CommitteeActions.jsx",
    unavailable: "state", evidence: "contract_verified", suite: "TestEvidenceAcceptance", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الإغلاق يستلزم حكمًا مقبولًا من محكِّم مستقل، ويتوقف عند حجز قانوني قائم أو تعذّر إثبات حالته (fail-closed).", note_en: "Closure requires an accepted verdict from an independent verifier, and stops on an active legal hold or on a hold state that cannot be established (fail-closed)." },
  { id: "share_action_extract", ar: "إصدار مستخلص التزام لجهة", en: "Share an obligation extract", stage: "execution", kind: "act",
    capability: "action.admin", capability_source: "verified", command: "ShareActionExtract", contract: "execution-extract-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/actions", route_file: "src/components/raqeem/ActionExtractPanel.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestExecutionExtract", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الحق المُمارَس فعلًا `action.admin` (لا `action.extract.share`) — وقد صُحّح في السجل من الأمر نفسه.", note_en: "The right actually enforced is `action.admin` (not `action.extract.share`) — corrected in the register from the command itself.",
    note_ar: "الرابط يحمل قدرة واحدة على التزام واحد، وينتهي بانتهاء وقته أو بإلغائه خادميًا.", note_en: "The link carries one capability over one obligation, and closes on expiry or on server-side revocation." },
  { id: "view_action_extract", ar: "عرض الجهة لمستخلص التزامها", en: "Recipient view of the extract", stage: "execution", kind: "view",
    capability: "none", capability_source: "verified", command: "GetActionExtractView", contract: "execution-extract-1.0.0",
    actor_binding: "none", route: "/extract/:token", route_file: "src/pages/ActionExtractView.jsx",
    unavailable: "not_seated", evidence: "contract_verified", suite: "TestExecutionExtract", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الإقرار ثبوت استلام لا اعتماد؛ والسؤال يفتح توضيحًا ولا يغيّر حالة ولا مهلة.", note_en: "Acknowledgement is a receipt, never an approval; a question opens a clarification and changes no state and no deadline." },
  { id: "respond_action_extract", ar: "إقرار الجهة أو سؤالها على المستخلص", en: "The recipient's receipt or question on the extract", stage: "execution", kind: "view",
    capability: "none", capability_source: "verified", command: "RespondToActionExtract", contract: "execution-extract-1.0.0",
    actor_binding: "none", route: "/extract/:token", route_file: "src/pages/ActionExtractView.jsx",
    unavailable: "not_seated", evidence: "contract_verified", suite: "TestExecutionExtract", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الرمز هو القدرة الوحيدة: فعل من لا حساب له، فلا يُقاس بمقعد — والإقرار يُعاد مكرَّرًا آمنًا ولا يُقرأ اعتمادًا ولا إنجازًا.", note_en: "The token is the only capability: the act of a party with no account, so no seat is required — and a repeated acknowledgement is idempotent and is never read as approval or completion." },

  // ── Oversight and closure ───────────────────────────────────────────────────────────────────────
  { id: "compile_change_inventory", ar: "تجميع تعداد التغيير", en: "Compile the change inventory", stage: "oversight", kind: "act",
    capability: "committee.manage", capability_source: "verified", command: "CompileChangeInventory", contract: "institutional-change-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/closure", route_file: "src/pages/committee/CommitteeClosure.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestInstitutionalChange", recorded_path: false, recorded_path_evidence: null,
    note_ar: "مصدر لم يُقرأ ⇒ التعداد غير مكتمل، لا «خالٍ».", note_en: "A source that could not be read makes the inventory incomplete — never empty." },
  { id: "record_change_disposition", ar: "تسجيل مصير التزام", en: "Record an obligation disposition", stage: "oversight", kind: "act",
    capability: "committee.manage", capability_source: "verified", command: "RecordChangeDisposition", contract: "institutional-change-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/closure", route_file: "src/pages/committee/CommitteeClosure.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestInstitutionalChange", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الحجز القانوني حالة لا نصًّا: يمنع الإغلاق والنقل والإسقاط، ورفعه فعل محكوم بسببه ولا يُغلق الالتزام.", note_en: "A legal hold is state, not a note: it stops closure, transfer and expiry, and releasing it is a governed act with its reason that closes nothing." },
  { id: "close_committee", ar: "إغلاق اللجنة", en: "Close the committee", stage: "oversight", kind: "act",
    capability: "committee.close", capability_source: "verified", command: "CloseCommittee", contract: "institutional-change-1.0.0",
    gated: true, state_from: "active | closing | temporarily_suspended | expiring_soon", actor_binding: "none",
    route: "/o/:orgRef/c/:committeeRef/closure", route_file: "src/pages/committee/CommitteeClosure.jsx",
    unavailable: "state", evidence: "partial", suite: "TestInstitutionalChange", recorded_path: false, recorded_path_evidence: null,
    note_ar: "تعداد التغيير هو تعداد الإغلاق: الجاهزية تُقرأ من العقد لا من صفحة السجل المحمَّلة.", note_en: "The change inventory is the closure inventory: readiness is read from the contract, not from whatever page happens to be loaded." },
  { id: "compile_committee_memory", ar: "تجميع ذاكرة اللجنة", en: "Compile committee memory", stage: "oversight", kind: "act",
    capability: "memory.compile", capability_source: "verified", command: "CompileCommitteeMemory", contract: null,
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/memory", route_file: "src/pages/committee/CommitteeMemory.jsx",
    unavailable: "authority", evidence: "not_assessed", recorded_path: false, recorded_path_evidence: null },
  { id: "read_committee_record", ar: "قراءة سجل اللجنة المحكومة", en: "Governed read of a committee record", stage: "oversight", kind: "view",
    capability: "read", capability_source: "verified", command: "GetCommitteeRecord", contract: "authz-1.10.0",
    actor_binding: "none", route: null, route_file: "src/hooks/useCommitteeRecord.js",
    unavailable: "authority", evidence: "contract_verified", suite: "TestAuthorizationGuard", recorded_path: false, recorded_path_evidence: null,
    note_ar: "مصدر واحد للقراءة المحكومة: النطاق يُشتق من السجل المستهدف لا من الطلب.", note_en: "The single governed read: scope is derived from the trusted target, never from the request." },
  { id: "view_seated_readiness", ar: "قياس جاهزية الفاعل المُقعد لكل لجنة", en: "Measure seated-actor readiness per committee", stage: "oversight", kind: "view",
    capability: "read", capability_source: "verified", command: "GetSeatedActorReadiness", contract: "seated-readiness-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/committees", route_file: "src/pages/OrgCommittees.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestSeatedReadiness", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الحاجز (D-064) صار مقيسًا لا مُدَّعى: المقاعد المؤهلة تُحتسب بقاعدة التصويت نفسها، والقدرة على العمل تستلزم ارتباطًا بحساب مستخدم، وكل مصدر لم يُقرأ يُعلن ⇒ «غير قابل للقياس» لا صفر.", note_en: "The blocker (D-064) is measured instead of asserted: eligible seats come from the voting rule itself, ability to act requires a bound user account, and every source that could not be read is named, so an unreadable committee reads 'unverifiable' rather than zero." },
  // ── S28 — the surfaces the person's own row and the assistant read through ───────────────────────
  // A live surface outside the register is how a surface comes to advertise what no command performs
  // (D-082 class). Each of these is a READ: it grants nothing, and every act it names is re-authorized
  // by its own command afterwards.
  { id: "view_personal_work", ar: "صف العمل الشخصي «مساحتي»", en: "The personal work row «My Workspace»", stage: "execution", kind: "view",
    capability: "read", capability_source: "verified", command: "GetMyWork", contract: "personal-work-1.0.0",
    actor_binding: "none", route: "/", route_file: "src/components/raqeem/MyWorkInbox.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestWorkReach", recorded_path: false, recorded_path_evidence: null,
    note_ar: "قراءة تمنح سلطة: كل فعل يسمّيه الصف يُعاد التحقق منه في أمره المحكوم. والوصول إلى المهمة مُقاس بعقد `work-reach-1.0.0`: تفاعلان كحدّ أقصى، وكل بند يتجاوز الحدّ يُسمّى بسببه وبالسطح الناقص.",
    note_en: "A read that grants no authority: every act it names is re-authorized by its own command. Task reach is measured under `work-reach-1.0.0`: two interactions at most, and every item beyond the limit is named with its reason and the missing surface." },
  { id: "view_metric_definitions", ar: "قراءة المؤشرات المعرَّفة", en: "Read the defined metrics", stage: "oversight", kind: "view",
    capability: "read", capability_source: "verified", command: "GetCommitteeMetrics", contract: "metric-definitions-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/reports", route_file: "src/pages/committee/CommitteeReports.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestMetricDefinitions", recorded_path: false, recorded_path_evidence: null,
    note_ar: "كل رقم يحمل مالكه وفترته وبسطه ومقامه ومصدره وحداثته؛ وما دون حد الإفصاح يُحجب، والمصدر غير المقروء «غير مقروء» لا صفر. والقراءة الحيّة جُرِّبت على لجنة تجريبية موسومة فقط، فلا يُدَّعى مسار محفوظ.",
    note_en: "Every figure carries its owner, period, numerator, denominator, source and freshness; anything under the disclosure floor is withheld, and an unreadable source reads 'unreadable', never zero. The live read ran on a flagged demonstration committee only, so no persisted path is claimed." },
  { id: "view_decision_dossier", ar: "تجميع ملف أدلة القرار", en: "Assemble the decision evidence dossier", stage: "decisions", kind: "view",
    capability: "read", capability_source: "verified", command: "GetDecisionDossier", contract: "evidence-dossier-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/components/raqeem/DossierExportPanel.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestEvidenceDossier", recorded_path: false, recorded_path_evidence: null,
    note_ar: "الملف يُبوَّب على قراءة السجل المحكوم نفسه؛ والقسم الفارغ يُقال بلفظه، والمصدر غير المقروء يُسمّى؛ وغياب واقعة ليس إثباتًا لعدم وقوعها.",
    note_en: "The file is gated behind the governed record read itself; an empty section is stated in words and an unreadable source is named; and an absent event is not proof that it did not happen." },
  { id: "view_proposal_material_change", ar: "عرض التغيير الجوهري في النص المُصوَّت عليه", en: "Show material change in the voted text", stage: "decisions", kind: "view",
    capability: "read", capability_source: "verified", command: "GetProposalChanges", contract: "material-change-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/decisions/:id", route_file: "src/components/raqeem/ProposalIntegrityPanel.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestMaterialChange", recorded_path: false, recorded_path_evidence: null,
    note_ar: "اللوحة لا تقرّر شيئًا: الرفض يقع على الخادم (`stale_content`)، وهي تعرض النص المجمّد وما تحرّك في معناه لا في صياغته — قبل المحاولة لا بعدها.",
    note_en: "The panel decides nothing: the refusal happens server-side (`stale_content`), and it shows the frozen text and what moved in its MEANING rather than its wording — before the attempt, not after it." },
  { id: "check_record_consistency", ar: "اتساق السجلات بين الكيانات", en: "Cross-record consistency", stage: "oversight", kind: "view",
    capability: "read", capability_source: "verified", command: "CheckRecordConsistency", contract: "record-consistency-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/audit", route_file: "src/components/raqeem/ConsistencyCheckPanel.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestRecordConsistency", recorded_path: false, recorded_path_evidence: null,
    note_ar: "فحص لا تصحيح: يقابل السجلات بقواعد تمتد بينها (إغلاق بلا حكم مقبول · حجز قائم · حزمة بلا بصمة · صوت بلا دورة مجمّدة · حضور بلا مقعد · تسليم لا يجمع). ومصدر لم يُقرأ تُسمّى قواعده **غير مُقيَّمة** ولا تُحسب نظيفة، ونطاق القراءة مُعلن بالحدّ المقيَّد.",
    note_en: "A check, not a correction: it matches records against rules that span them (closure without an accepted verdict · a standing hold · a package without a fingerprint · a ballot without a frozen round · presence without a seat · a handover whose arithmetic fails). A source that was not read has its rules reported NOT evaluated and never counted clean, and the read scope is declared with its cap." },
  { id: "view_exception_catalogue", ar: "سجل الاستثناءات", en: "The exception register", stage: "oversight", kind: "view",
    capability: "read", capability_source: "verified", command: "GetExceptionCatalogue", contract: "exception-catalogue-1.0.0",
    actor_binding: "none", route: "/o/:orgRef/c/:committeeRef/audit", route_file: "src/components/raqeem/ExceptionCataloguePanel.jsx",
    unavailable: "authority", evidence: "contract_verified", suite: "TestExceptionCatalogue", recorded_path: false, recorded_path_evidence: null,
    note_ar: "يجيب عن ثلاثة أسئلة لكل توقّف: ما الذي مُنع · ماذا يتوقف بالضبط · مَن يحلّه — ومعه **ما لا يجوز استنتاجه** وهو قائم. والسجل يُعلن ولا يقرّر، ويعلن ما لا يغطيه، ومصادره المُشتقّة مقارَنة لا منسوخة.",
    note_en: "Answers three questions for every stop: what was prevented · what exactly stops · who resolves it — with what may NEVER be assumed while it stands. The register declares and never decides, it names what it does not cover, and its derived sources are compared rather than copied." },
];

export const SURFACE_IDS = GOVERNANCE_SURFACES.map((s) => s.id);

export function surfaceById(id: string) {
  return GOVERNANCE_SURFACES.find((s) => s.id === id) || null;
}

export function surfacesByStage() {
  const out: Record<string, any[]> = {};
  for (const key of Object.keys(SURFACE_STAGES)) out[key] = GOVERNANCE_SURFACES.filter((s) => s.stage === key);
  return out;
}

/** The distinct capabilities the registry declares — what a governed read must check, at most once each. */
export function declaredCapabilities() {
  return [...new Set(GOVERNANCE_SURFACES.map((s) => s.capability).filter((c) => c && c !== "none"))];
}

export function summarizeRegistry() {
  const by_stage: Record<string, number> = {};
  for (const s of GOVERNANCE_SURFACES) by_stage[s.stage] = (by_stage[s.stage] || 0) + 1;
  const by_evidence: Record<string, number> = {};
  for (const s of GOVERNANCE_SURFACES) by_evidence[s.evidence] = (by_evidence[s.evidence] || 0) + 1;
  const by_binding: Record<string, number> = {};
  for (const s of GOVERNANCE_SURFACES) by_binding[s.actor_binding || "none"] = (by_binding[s.actor_binding || "none"] || 0) + 1;
  return {
    total: GOVERNANCE_SURFACES.length,
    acts: GOVERNANCE_SURFACES.filter((s) => s.kind === "act").length,
    views: GOVERNANCE_SURFACES.filter((s) => s.kind === "view").length,
    by_stage,
    by_evidence,
    by_binding,
    state_gated: GOVERNANCE_SURFACES.filter((s) => s.gated === true).length,
    recorded_paths: GOVERNANCE_SURFACES.filter((s) => s.recorded_path === true).length,
    // Named, never implied: the registry counts its own gaps.
    unverified_capabilities: GOVERNANCE_SURFACES.filter((s) => s.capability_source === "unverified").map((s) => ({ id: s.id, command: s.command })),
    blocked_awaiting_seated_actor: GOVERNANCE_SURFACES.filter((s) => s.recorded_path !== true).map((s) => s.id),
  };
}

/**
 * THE SELF-CHECK. A registry that cannot fail is a brochure. Each finding names the surface it belongs
 * to; `ok` is true only when there is no finding at all.
 */
export function auditRegistry() {
  const findings: any[] = [];
  const add = (code: string, surface_id: string | null, detail: string) => findings.push({ code, surface_id, detail });

  const ids = new Set<string>();
  const routeKeys = new Map<string, string>();
  for (const s of GOVERNANCE_SURFACES) {
    if (ids.has(s.id)) add("duplicate_id", s.id, "Two surfaces share one id");
    ids.add(s.id);

    // A page may lawfully host several governed acts (one meeting page carries start, adjourn,
    // cancel and the agenda transitions). What is a finding is a surface that repeats the SAME route
    // with the SAME command and the SAME right — a true duplicate entry, not a shared page.
    if (s.route) {
      const key = `${s.route}|${s.command}|${s.capability}`;
      if (routeKeys.has(key)) add("duplicate_surface", s.id, `Same route, command and capability as ${routeKeys.get(key)}`);
      routeKeys.set(key, s.id);
    }

    // Every surface states a capability and a command — there is no surface that acts by itself.
    if (!s.capability) add("no_capability", s.id, "The surface names no capability");
    if (!s.command) add("no_command", s.id, "The surface names no command");
    if (s.kind === "act" && !s.unavailable) add("no_unavailable_class", s.id, "An act surface states no unavailable class");
    if (s.unavailable && !UNAVAILABLE_CLASSES[s.unavailable]) add("unknown_unavailable_class", s.id, `Unavailable class '${s.unavailable}' is not declared`);
    if (s.gated === true && !s.state_from) add("gated_without_state", s.id, "A state-gated act names no gating state");
    if (s.kind === "view" && s.unavailable && (s.unavailable === "state" || s.unavailable === "no_command")) {
      add("view_cannot_be_gated", s.id, "A read surface is not gated on a record state and never performs an act");
    }

    // Identity binding is stated as a field, so the binding is testable rather than described.
    const binding = s.actor_binding || "none";
    if (!ACTOR_BINDINGS[binding]) add("unknown_binding", s.id, `Actor binding '${binding}' is not declared`);
    if (binding !== "none" && !s.bound_field) add("binding_without_field", s.id, "A bound surface names no bound field");

    // Evidence may not be overstated.
    if (!EVIDENCE_STATUSES[s.evidence]) add("unknown_evidence_status", s.id, `Evidence status '${s.evidence}' is not declared`);
    if (s.evidence === "contract_verified" && !s.suite) add("verified_without_suite", s.id, "Contract-verified without naming its suite");
    if (s.evidence === "not_assessed" && s.suite) add("suite_without_assessment", s.id, "A suite is named while the surface is declared not assessed");

    // Coherence: acceptance is never claimed without a recorded path, and recorded proof is never
    // reported as blocked.
    if (s.recorded_path === true && !s.recorded_path_evidence) add("path_without_evidence", s.id, "A recorded path is claimed with no correlation reference");
    if (s.recorded_path !== true && s.recorded_path_evidence) add("evidence_without_path", s.id, "A correlation reference is named while the path is not recorded");
    if (s.recorded_path === true && s.evidence !== "contract_verified" && s.evidence !== "partial") {
      add("path_without_contract", s.id, "A persisted path is claimed without contract evidence");
    }

    // The no-deletion rule of a governance system, enforced on the registry itself.
    if (/Delete|Remove/.test(s.command)) add("deleting_command", s.id, "A governance surface never deletes a record");
    if (s.capability_source === "unverified") add("capability_unverified", s.id, `Capability '${s.capability}' for ${s.command} was not re-derived in this pass`);
  }

  return {
    contract_version: GOVERNANCE_SURFACES_VERSION,
    ok: findings.filter((f) => f.code !== "capability_unverified").length === 0,
    findings,
    blocking: findings.filter((f) => f.code !== "capability_unverified"),
    declared_work: findings.filter((f) => f.code === "capability_unverified"),
    note_ar: "الفحص يقبل بأن يُعلن السجل نقصه (`capability_unverified`) ولا يقبل أن يدّعي ما لا يستطيع إثباته.",
    note_en: "The check accepts a registry that DECLARES its own gap (`capability_unverified`) and refuses one that claims what it cannot show.",
  };
}