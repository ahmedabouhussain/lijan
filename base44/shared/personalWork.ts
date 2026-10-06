// personalWork.ts — «مساحتي»: the ONE description of "what is required of me now".
//
// CONTRACT VERSION: personal-work-1.0.0 (6 Oct 2026 — product brief revision 3, Phase 1, streams A/D).
//
// A personal work item is NOT a notification and NOT a reminder. It is a GOVERNED RECORD that names ONE
// act for ONE person, and it exists only when that person holds the right to perform the act (a seat
// capability) or when the record names them BY IDENTITY. Three consequences this module keeps:
//
//   1. An office held in one institution lends nothing in another: authority is resolved per committee,
//      never from a selected organization, a job title or a platform role.
//   2. A state that no command in this build can write never produces an item (the D-041 class of
//      defect: an unreachable state must not be the only key to an action the queue advertises).
//   3. "Nothing to do" and "we could not look" are different answers: an unread source is reported by
//      the caller, never rendered as an empty queue or a zero.
//
// A person-scoped item is the person's OWN obligation: identity-bound items (owner of an action, the
// named successor of a handover) are never transferable to another seat (AuthZ 1.6.0).
//
// This module reads no records and writes none: it is pure assembly + policy, so a test can assert the
// same object the command consumes.

import { DONE_STATUSES, todayIso } from './actionState.ts';

export const PERSONAL_WORK_VERSION = 'personal-work-1.0.0';

// ── Groups: what kind of attention the item asks for ──────────────────────────
export const WORK_GROUPS: Record<string, { ar: string; en: string }> = {
  preparation: { ar: 'تحضير', en: 'Preparation' },
  voting: { ar: 'تصويت', en: 'Voting' },
  issuance: { ar: 'إصدار واعتماد', en: 'Issuance' },
  execution: { ar: 'تنفيذ', en: 'Execution' },
  verification: { ar: 'تحقق مستقل', en: 'Independent verification' },
  succession: { ar: 'استمرارية', en: 'Continuity' },
  review: { ar: 'مراجعة', en: 'Review' },
  follow_up: { ar: 'متابعة', en: 'Follow-up' },
};

// ── Kinds: one row per act the platform can actually ask a person to perform ──
// `capability` names the right that carries the act; `identity` marks an item whose authority rests on
// the RECORD naming the person (owner / named successor / addressed reviewer).
// `segment` is the committee surface the act is performed on.
export const WORK_ITEM_KINDS: Record<string, any> = {
  action_evidence: {
    group: 'execution', capability: 'action.progress', identity: 'owner', segment: 'actions', weight: 30,
    next: { ar: 'تقديم أو تحديث دليل التنفيذ', en: 'Submit or update the execution evidence' },
  },
  action_verify: {
    group: 'verification', capability: 'action.verify', identity: null, segment: 'evidence', weight: 20,
    next: { ar: 'التحقق المستقل من الدليل', en: 'Independently verify the evidence' },
  },
  action_close: {
    group: 'execution', capability: 'action.close', identity: null, segment: 'actions', weight: 25,
    next: { ar: 'إغلاق الإجراء على حكم مقبول', en: 'Close the action on the accepted verdict' },
  },
  decision_submit: {
    group: 'preparation', capability: 'decision.submit', identity: null, segment: 'decisions', weight: 35,
    next: { ar: 'إرسال مشروع القرار للمراجعة', en: 'Send the decision draft for review' },
  },
  decision_issue: {
    group: 'issuance', capability: 'decision.issue', identity: null, segment: 'decisions', weight: 15,
    next: { ar: 'إصدار القرار', en: 'Issue the decision' },
  },
  decision_execute: {
    group: 'execution', capability: 'decision.execute', identity: null, segment: 'decisions', weight: 22,
    next: { ar: 'بدء التنفيذ على قرار صادر', en: 'Start execution on the issued decision' },
  },
  vote_cast: {
    group: 'voting', capability: 'vote.cast', identity: 'seat', segment: 'voting', weight: 10,
    next: { ar: 'تسجيل صوتي في الدورة المفتوحة', en: 'Cast my ballot in the open round' },
  },
  minutes_draft: {
    group: 'preparation', capability: 'minutes.draft', identity: null, segment: 'minutes', weight: 34,
    next: { ar: 'إرسال المحضر للمراجعة', en: 'Send the minutes for review' },
  },
  minutes_approve: {
    group: 'issuance', capability: 'minutes.approve', identity: null, segment: 'minutes', weight: 18,
    next: { ar: 'اعتماد المحضر', en: 'Approve the minutes' },
  },
  minutes_issue: {
    group: 'issuance', capability: 'minutes.issue', identity: null, segment: 'minutes', weight: 19,
    next: { ar: 'إصدار المحضر للمعنيين', en: 'Issue the minutes to those entitled' },
  },
  handover_accept: {
    group: 'succession', capability: 'seat.handover_accept', identity: 'successor', segment: 'people:handover', weight: 5,
    next: { ar: 'قبول حزمة التسليم باسمي أنا', en: 'Accept the handover under my own identity' },
  },
  review_respond: {
    group: 'review', capability: 'review.respond', identity: 'reviewer', segment: 'documents', weight: 28,
    next: { ar: 'الرد على طلب المراجعة الموجَّه إليّ', en: 'Respond to the review request addressed to me' },
  },
  seat_expiry: {
    group: 'follow_up', capability: null, identity: 'seat', segment: 'people:appointments', weight: 40,
    next: { ar: 'مراجعة استمرارية المقعد', en: 'Review the seat’s continuity' },
  },
};

// ── State vocabulary: the surface never invents a word for a state ────────────
// Each family is read from its OWN lifecycle contract version; a value not listed here is reported as
// unknown rather than rendered as if it were a governed state.
export const STATE_LABELS: Record<string, any[]> = {
  action: [
    { values: ['assigned'], ar: 'مُكلَّف', en: 'Assigned', tone: 'neutral' },
    { values: ['in_progress'], ar: 'قيد التنفيذ', en: 'In progress', tone: 'progress' },
    { values: ['blocked'], ar: 'متعطّل', en: 'Blocked', tone: 'danger' },
    { values: ['evidence_pending'], ar: 'بانتظار الدليل', en: 'Evidence pending', tone: 'progress' },
    { values: ['under_review'], ar: 'قيد التحقق المستقل', en: 'Under independent review', tone: 'ceremonial' },
    { values: ['verified'], ar: 'مُتحقَّق', en: 'Verified', tone: 'success' },
    { values: ['closed'], ar: 'مُغلق', en: 'Closed', tone: 'neutral' },
    { values: ['overdue'], ar: 'متأخر', en: 'Overdue', tone: 'danger' },
  ],
  verification: [
    { values: ['not_submitted'], ar: 'لم يُقدَّم دليل', en: 'No evidence submitted', tone: 'neutral' },
    { values: ['submitted'], ar: 'بانتظار تحقق مستقل', en: 'Awaiting independent verification', tone: 'ceremonial' },
    { values: ['returned'], ar: 'أُعيد للتعديل', en: 'Returned for correction', tone: 'warning' },
    { values: ['accepted'], ar: 'دليل مقبول', en: 'Evidence accepted', tone: 'success' },
  ],
  decision: [
    { values: ['draft'], ar: 'مسودة', en: 'Draft', tone: 'neutral' },
    { values: ['in_review'], ar: 'قيد المراجعة', en: 'In review', tone: 'progress' },
    { values: ['voting'], ar: 'تصويت مفتوح', en: 'Voting open', tone: 'ceremonial' },
    { values: ['approved'], ar: 'معتمد', en: 'Approved', tone: 'success' },
    { values: ['rejected'], ar: 'مرفوض', en: 'Rejected', tone: 'danger' },
    { values: ['issued'], ar: 'صادر', en: 'Issued', tone: 'success' },
    { values: ['executing'], ar: 'قيد التنفيذ', en: 'Executing', tone: 'progress' },
    { values: ['superseded'], ar: 'مُستبدَل', en: 'Superseded', tone: 'neutral' },
  ],
  minutes: [
    { values: ['draft'], ar: 'مسودة محضر', en: 'Minutes draft', tone: 'neutral' },
    { values: ['in_review'], ar: 'محضر قيد المراجعة', en: 'Minutes in review', tone: 'progress' },
    { values: ['approved'], ar: 'محضر معتمد', en: 'Minutes approved', tone: 'success' },
    { values: ['issued'], ar: 'محضر صادر', en: 'Minutes issued', tone: 'success' },
    { values: ['amended', 'amended_draft'], ar: 'محضر مُعدَّل', en: 'Minutes amended', tone: 'warning' },
  ],
  handover: [
    { values: ['pending_acceptance'], ar: 'بانتظار قبولي', en: 'Awaiting my acceptance', tone: 'ceremonial' },
    { values: ['partially_accepted'], ar: 'مقبول جزئيًا', en: 'Partially accepted', tone: 'warning' },
    { values: ['returned'], ar: 'مُعاد لنقص معلومات', en: 'Returned for missing information', tone: 'warning' },
    { values: ['accepted'], ar: 'مقبول', en: 'Accepted', tone: 'success' },
  ],
  review: [
    { values: ['pending'], ar: 'طلب مراجعة جديد', en: 'New review request', tone: 'ceremonial' },
    { values: ['accepted'], ar: 'مراجعة مقبولة', en: 'Review accepted', tone: 'progress' },
    { values: ['in_review'], ar: 'قيد المراجعة', en: 'In review', tone: 'progress' },
    { values: ['overdue'], ar: 'مراجعة متأخرة', en: 'Review overdue', tone: 'danger' },
  ],
  seat: [
    { values: ['acting_expired'], ar: 'تكليف مؤقت منتهٍ والمقعد نشط', en: 'Acting appointment expired while the seat is active', tone: 'danger' },
    { values: ['acting_expiring'], ar: 'تكليف مؤقت قارب على الانتهاء', en: 'Acting appointment nearing expiry', tone: 'warning' },
    { values: ['term_expiring'], ar: 'مدة العضوية قاربت على الانتهاء', en: 'Term nearing its end', tone: 'warning' },
  ],
};

export function stateLabel(family: string, value: any) {
  const rows = STATE_LABELS[family] || [];
  const row = rows.find((r) => r.values.includes(value));
  if (!row) return { value: value ?? null, ar: value ?? '—', en: value ?? '—', tone: 'neutral', known: false };
  return { value, ar: row.ar, en: row.en, tone: row.tone, known: true };
}

// ── Deadline band: overdue is a property of the record, never of the view ─────
export function deadlineBand(due: any, today = todayIso()) {
  if (!due) return { band: 'none', days: null };
  const day = String(due).slice(0, 10);
  const ms = Date.parse(day + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z');
  const days = Number.isFinite(ms) ? Math.round(ms / 86400000) : null;
  if (days === null) return { band: 'unknown', days: null };
  if (days < 0) return { band: 'overdue', days };
  if (days === 0) return { band: 'today', days };
  if (days <= 3) return { band: 'soon', days };
  return { band: 'later', days };
}

const BAND_RANK: Record<string, number> = { overdue: 0, today: 1, soon: 2, unknown: 3, later: 4, none: 5 };

/** The ONE priority rule: urgency of the deadline first, then the act's own weight. */
export function priorityOf(item: any) {
  const band = item.deadline_band?.band || 'none';
  return (BAND_RANK[band] ?? 5) * 100 + (WORK_ITEM_KINDS[item.kind]?.weight ?? 50);
}

export function rankItems(items: any[]) {
  return (items || [])
    .map((it) => ({ ...it, priority: priorityOf(it) }))
    .sort((a, b) => (a.priority - b.priority) || String(a.id).localeCompare(String(b.id)));
}

export function summarizeItems(items: any[]) {
  const counts: any = { total: items.length, overdue: 0, due_soon: 0, by_group: {} };
  for (const it of items) {
    if (it.deadline_band?.band === 'overdue') counts.overdue += 1;
    if (['today', 'soon'].includes(it.deadline_band?.band)) counts.due_soon += 1;
    counts.by_group[it.group] = (counts.by_group[it.group] || 0) + 1;
  }
  return counts;
}

// ── Authority wording: stated once, so every surface explains visibility the same way ──
function capacityBasis(capacity: any, extraAr?: string, extraEn?: string) {
  const roleAr = capacity?.role_label?.ar || capacity?.role || '—';
  const roleEn = capacity?.role_label?.en || capacity?.role || '—';
  const delegation = capacity?.delegation
    ? { ar: '، ويُمارَس اليوم بموجب تفويض سارٍ', en: ', exercised today under an active delegation' }
    : { ar: '', en: '' };
  return {
    ar: `${extraAr || `بصفتك ${roleAr} في هذه اللجنة`}${delegation.ar}`,
    en: `${extraEn || `Because you hold the seat of ${roleEn} in this committee`}${delegation.en}`,
  };
}

function makeItem(kind: string, opts: any) {
  const def = WORK_ITEM_KINDS[kind];
  const place = opts.place || null;
  const band = deadlineBand(opts.deadline);
  return {
    id: `${kind}:${opts.recordId}`,
    kind,
    group: def.group,
    group_label: WORK_GROUPS[def.group],
    title: opts.title,
    subtitle: opts.subtitle || null,
    place: place
      ? { committee: place.committee, organization: place.organization }
      : null,
    capacity: opts.capacity || null,
    state: opts.state,
    secondary_state: opts.secondary_state || null,
    deadline: opts.deadline || null,
    deadline_band: band,
    next: { label: def.next, capability: def.capability, segment: def.segment },
    why: { ar: opts.why?.ar, en: opts.why?.en, identity: def.identity || null },
    route: opts.route || null,
    source: { entity: opts.entity, id: opts.recordId, state: opts.rawState ?? null },
  };
}

// ── Builders ─────────────────────────────────────────────────────────────────
// Every builder takes the SAME injected gates:
//   can(committeeId, capability) → boolean   (resolved by the caller from the authority kernel)
//   placeFor(committeeId)        → { committee:{id,ref,name{ar,en}}, organization:{ref,name{ar,en}} }
//   linkFor(committeeId, kind, recordId) → route string

export function actionWorkItems({ actions = [], actorId, can, capacityFor, placeFor, linkFor }: any) {
  const items: any[] = [];
  for (const a of actions) {
    const done = DONE_STATUSES.includes(a.status);
    const place = placeFor(a.committee_id);
    if (!place) continue;

    // The owner's own obligation — identity of record, not office.
    if (a.owner_user_id === actorId && !done) {
      if (!can(a.committee_id, 'action.progress')) continue;
      items.push(makeItem('action_evidence', {
        recordId: a.id, entity: 'Action', rawState: a.status,
        title: { ar: a.title_ar || a.title, en: a.title_en || a.title },
        subtitle: a.required_evidence || a.required_evidence_en || null,
        place, capacity: null, deadline: a.deadline,
        state: stateLabel('action', a.status),
        secondary_state: stateLabel('verification', a.verification_state || 'not_submitted'),
        why: {
          ar: 'لأن سجل الإجراء يسمّيك مالكًا له — والتزامًا بالهوية لا بالمنصب',
          en: 'Because the action record names you as its owner — an obligation of identity, not of office',
        },
        route: linkFor(a.committee_id, 'action_evidence', a.id),
      }));
      continue;
    }

    // Independent verification: never the seat that submitted the revision.
    if (a.verification_state === 'submitted' && a.evidence_submitted_by_user_id !== actorId) {
      if (!can(a.committee_id, 'action.verify')) continue;
      items.push(makeItem('action_verify', {
        recordId: a.id, entity: 'Action', rawState: a.verification_state,
        title: { ar: a.title_ar || a.title, en: a.title_en || a.title },
        subtitle: a.evidence_notes || null,
        place, capacity: capacityFor(a.committee_id), deadline: a.deadline,
        state: stateLabel('verification', 'submitted'),
        why: capacityBasis(capacityFor(a.committee_id),
          'لأنك تحمل حق التحقق المستقل في هذه اللجنة، ولم تُقدِّم هذه المراجعة',
          'Because you hold the independent-verification right here and did not submit this revision'),
        route: linkFor(a.committee_id, 'action_verify', a.id),
      }));
      continue;
    }

    // Closure on an accepted verdict — never on a field the performer writes.
    if (a.verification_state === 'accepted' && !done) {
      if (!can(a.committee_id, 'action.close')) continue;
      items.push(makeItem('action_close', {
        recordId: a.id, entity: 'Action', rawState: a.status,
        title: { ar: a.title_ar || a.title, en: a.title_en || a.title },
        place, capacity: capacityFor(a.committee_id), deadline: a.deadline,
        state: stateLabel('action', a.status),
        secondary_state: stateLabel('verification', 'accepted'),
        why: capacityBasis(capacityFor(a.committee_id)),
        route: linkFor(a.committee_id, 'action_close', a.id),
      }));
    }
  }
  return items;
}

export function decisionWorkItems({ decisions = [], votedDecisionIds = [], can, capacityFor, placeFor, linkFor }: any) {
  const items: any[] = [];
  for (const d of decisions) {
    const place = placeFor(d.committee_id);
    if (!place) continue;
    const title = { ar: d.title_ar || d.title, en: d.title_en || d.title };
    const capacity = capacityFor(d.committee_id);
    let kind: string | null = null;
    if (d.status === 'draft') kind = 'decision_submit';
    else if (d.status === 'voting') kind = 'vote_cast';
    else if (d.status === 'approved') kind = 'decision_issue';
    else if (d.status === 'issued') kind = 'decision_execute';
    if (!kind) continue;
    const def = WORK_ITEM_KINDS[kind];
    if (!can(d.committee_id, def.capability)) continue;
    // A ballot already cast in this decision is not pending work.
    if (kind === 'vote_cast' && votedDecisionIds.includes(d.id)) continue;
    items.push(makeItem(kind, {
      recordId: d.id, entity: 'Decision', rawState: d.status,
      title, subtitle: d.decision_number ? { ar: d.decision_number, en: d.decision_number } : null,
      place, capacity, deadline: d.deadline,
      state: stateLabel('decision', d.status),
      why: kind === 'vote_cast'
        ? capacityBasis(capacity, 'بصفتك مقعدًا يحمل حق التصويت في دورة مفتوحة')
        : capacityBasis(capacity),
      route: linkFor(d.committee_id, kind, d.id),
    }));
  }
  return items;
}

export function minutesWorkItems({ minutes = [], can, capacityFor, placeFor, linkFor }: any) {
  const items: any[] = [];
  for (const m of minutes) {
    const place = placeFor(m.committee_id);
    if (!place) continue;
    let kind: string | null = null;
    if (m.status === 'draft') kind = 'minutes_draft';
    else if (m.status === 'in_review') kind = 'minutes_approve';
    else if (m.status === 'approved') kind = 'minutes_issue';
    if (!kind) continue;
    const def = WORK_ITEM_KINDS[kind];
    if (!can(m.committee_id, def.capability)) continue;
    const capacity = capacityFor(m.committee_id);
    items.push(makeItem(kind, {
      recordId: m.id, entity: 'MeetingMinutes', rawState: m.status,
      title: {
        ar: m.minutes_number ? `محضر رقم ${m.minutes_number}` : 'محضر اجتماع',
        en: m.minutes_number ? `Minutes ${m.minutes_number}` : 'Meeting minutes',
      },
      subtitle: m.summary_ar || m.summary_en || null,
      place, capacity,
      state: stateLabel('minutes', m.status),
      why: capacityBasis(capacity),
      route: linkFor(m.committee_id, kind, m.id),
    }));
  }
  return items;
}

export function handoverWorkItems({ packs = [], actorId, placeFor, linkFor }: any) {
  const items: any[] = [];
  for (const p of packs) {
    if (p.successor_user_id !== actorId) continue;
    if (!['pending_acceptance', 'partially_accepted'].includes(p.status)) continue;
    const place = placeFor(p.committee_id);
    if (!place) continue;
    items.push(makeItem('handover_accept', {
      recordId: p.id, entity: 'HandoverPack', rawState: p.status,
      title: {
        ar: `حزمة تسليم إليك: ${p.items_total || 0} التزامًا مفتوحًا`,
        en: `Handover addressed to you: ${p.items_total || 0} open obligations`,
      },
      subtitle: p.notes || null,
      place, capacity: null, deadline: null,
      state: stateLabel('handover', p.status),
      why: {
        ar: 'لأن حزمة التسليم تُسمّيك خلفًا لها؛ والقبول باسمك أنت، ولا تقبله المؤسسة نيابةً عنك',
        en: 'Because the handover names you as successor; acceptance is yours alone, and no institution accepts on your behalf',
      },
      route: linkFor(p.committee_id, 'handover_accept', p.id),
    }));
  }
  return items;
}

export function reviewWorkItems({ requests = [], actorId, can, capacityFor, placeFor, linkFor }: any) {
  const items: any[] = [];
  for (const r of requests) {
    if (r.reviewer_user_id !== actorId) continue;
    if (!['pending', 'accepted', 'in_review'].includes(r.status)) continue;
    const place = placeFor(r.committee_id);
    if (!place) continue;
    if (!can(r.committee_id, 'review.respond')) continue;
    const capacity = capacityFor(r.committee_id);
    items.push(makeItem('review_respond', {
      recordId: r.id, entity: 'ReviewRequest', rawState: r.status,
      title: {
        ar: `طلب مراجعة (${r.review_type || 'عام'}) موجَّه إليك`,
        en: `Review request (${r.review_type || 'general'}) addressed to you`,
      },
      subtitle: r.instructions || null,
      place, capacity, deadline: r.due_date,
      state: stateLabel('review', r.status),
      why: {
        ar: 'لأن الطلب يسمّيك مراجعًا بالذات، لا لأنك تحمل منصبًا',
        en: 'Because the request names you as reviewer by identity, not because you hold an office',
      },
      route: linkFor(r.committee_id, 'review_respond', r.document_id),
    }));
  }
  return items;
}

/** Seat continuity: a bounded appointment that has expired or is about to, and a term nearing its end. */
export function seatContinuityItems({ seats = [], actorId, today = todayIso(), horizonDays = 30, placeFor, linkFor }: any) {
  const items: any[] = [];
  for (const s of seats) {
    if (s.user_id !== actorId || s.status !== 'active') continue;
    const place = placeFor(s.committee_id);
    if (!place) continue;
    let stateValue: string | null = null;
    let deadline: string | null = null;
    if (s.acting_expires_at) {
      const band = deadlineBand(s.acting_expires_at, today);
      if (band.band === 'overdue') { stateValue = 'acting_expired'; deadline = s.acting_expires_at; }
      else if (band.days !== null && band.days <= horizonDays) { stateValue = 'acting_expiring'; deadline = s.acting_expires_at; }
    }
    if (!stateValue && s.term_end) {
      const band = deadlineBand(s.term_end, today);
      if (band.band !== 'overdue' && band.days !== null && band.days <= horizonDays) {
        stateValue = 'term_expiring'; deadline = s.term_end;
      }
    }
    if (!stateValue) continue;
    items.push(makeItem('seat_expiry', {
      recordId: s.id, entity: 'CommitteeMembership', rawState: stateValue,
      title: {
        ar: stateValue === 'acting_expired'
          ? 'تكليف مؤقت انتهى وما زال المقعد نشطًا'
          : stateValue === 'acting_expiring'
            ? 'تكليف مؤقت قارب على الانتهاء'
            : 'مدة العضوية قاربت على الانتهاء',
        en: stateValue === 'acting_expired'
          ? 'Acting appointment expired while the seat is still active'
          : stateValue === 'acting_expiring'
            ? 'Acting appointment nearing expiry'
            : 'Membership term nearing its end',
      },
      subtitle: s.post_ar || s.post_en || null,
      place,
      capacity: { role: s.role, role_label: null, delegation: false },
      deadline, state: stateLabel('seat', stateValue),
      why: {
        ar: 'لأن المقعد الذي تشغله أنت مقيَّد بزمن؛ والمقعد يبقى، والرخصة المؤقتة لا تصبح دائمة بالبقاء',
        en: 'Because the seat you occupy is time-bounded; the seat remains, and a temporary grant never becomes permanent by remaining in force',
      },
      route: linkFor(s.committee_id, 'seat_expiry', s.id),
    }));
  }
  return items;
}

// ── Reach: «تفاعلان للوصول إلى المهمة» (work-reach-1.0.0) ─────────────────────
// A DECLARED measure, never a claim. The queue lives on the page the person lands on, so the first
// interaction is opening «مساحتي»; reaching the ONE task may cost a second interaction only if the route
// the item carries opens the RECORD ITSELF. A route that lands on a committee segment costs a third —
// and that is named, with the segment, instead of being reported as two.
export const WORK_REACH_VERSION = 'work-reach-1.0.0';
export const REACH_MAX_INTERACTIONS = 2;

export const REACH_CODES: Record<string, { ar: string; en: string }> = {
  record_route: {
    ar: 'تفاعلان: تُفتح «مساحتي» ثم يُفتح السجل نفسه مباشرةً.',
    en: 'Two interactions: «مساحتي» opens, then the record itself opens directly.',
  },
  segment_route: {
    ar: 'ثلاثة تفاعلات: يُفتح قسم اللجنة أولًا ثم يُبحث عن السجل داخله — ولا صفحة سجل مستقلة لهذا النوع بعد.',
    en: 'Three interactions: the committee segment opens first, then the record is found inside it — no standalone record page exists for this kind yet.',
  },
  no_route: {
    ar: 'لا مسار مباشر من الصف: لا يُقاس، ويُعلن بدل أن يُدَّعى تفاعلان.',
    en: 'No direct route from the row: it is not measured, and it is declared instead of claimed as two interactions.',
  },
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The record's own id as a PATH SEGMENT of the route — never a substring (a1 must not match a10). */
function routeOpensRecord(route: string, recordId: any) {
  if (!recordId) return false;
  const pattern = new RegExp(`(^|/)${escapeRegex(String(recordId))}(/|$|\\?|#)`);
  return pattern.test(String(route));
}

/** One item's reach, measured from the route it carries. It carries no capability: the act is its command's. */
export function measureReach(item: any) {
  const route = item?.route || null;
  const recordId = item?.source?.id || null;
  const base = { item_id: item?.id || null, kind: item?.kind || null, segment: item?.next?.segment || null };
  if (!route) {
    return { ...base, interactions: null, within_max: false, code: 'no_route', label: REACH_CODES.no_route };
  }
  if (routeOpensRecord(route, recordId)) {
    return { ...base, interactions: REACH_MAX_INTERACTIONS, within_max: true, code: 'record_route', label: REACH_CODES.record_route };
  }
  return { ...base, interactions: REACH_MAX_INTERACTIONS + 1, within_max: false, code: 'segment_route', label: REACH_CODES.segment_route };
}

/** The queue's reach as ONE measure: what is within the limit, and every item that exceeds it, by name. */
export function auditReach(items: any[]) {
  const rows: any[] = (items || []).map(measureReach);
  const beyond = rows.filter((r) => !r.within_max);
  return {
    contract_version: WORK_REACH_VERSION,
    max_interactions: REACH_MAX_INTERACTIONS,
    measured: rows.length,
    within_max: rows.length - beyond.length,
    beyond_max: beyond.length,
    ok: beyond.length === 0,
    items_beyond_max: beyond,
    codes: REACH_CODES,
    note_ar: 'القياس معلن لا مدَّعى: «مساحتي» تُفتح بتفاعل واحد، والوصول إلى المهمة يجب ألا يزيد على تفاعل ثانٍ يفتح السجل نفسه؛ وكل بند يتجاوز الحدّ يُسمّى بسببه وبالسطح الناقص.',
    note_en: 'A declared measure, not a claim: «مساحتي» opens in one interaction, and reaching the task must not exceed a second that opens the record itself; every item beyond the limit is named with its reason and the missing surface.',
  };
}

/** One assembly, so the queue, its counts, its reach and the export can never disagree. */
export function assemblePersonalWork(input: any) {
  const items = rankItems([
    ...actionWorkItems(input),
    ...decisionWorkItems(input),
    ...minutesWorkItems(input),
    ...handoverWorkItems(input),
    ...reviewWorkItems(input),
    ...seatContinuityItems(input),
  ]).map((it) => ({ ...it, reach: measureReach(it) }));
  return {
    contract_version: PERSONAL_WORK_VERSION,
    items,
    counts: summarizeItems(items),
    reach: auditReach(items),
  };
}