// LIJAN™ — Execution Reminder Engine.
//
// The ONE policy source for the automatic follow-up system (Ameen / نظام المتابعة الآلي):
// which open actions count as approaching / due today / overdue, what escalation level an overdue
// action has EARNED, who is accountable for it, and the formal notice the recipient receives.
// Pure functions, no SDK calls — so the two runners (deadline reminders and the Ameen follow-up
// digest) can never drift apart, and the same policy is auditable in one place.

export const OPEN_ACTION_STATUSES = ['assigned', 'in_progress', 'blocked', 'evidence_pending', 'under_review', 'overdue'];

export const ESCALATION_CHAIN = ['none', 'reminder', 'priority_reminder', 'owner_secretary', 'chair', 'escalation_authority'];

// Offices that carry institutional accountability for execution inside a committee.
export const ACCOUNTABLE_OFFICE_ROLES = ['chair', 'vice_chair', 'secretary', 'committee_administrator'];

export const OFFICE_LABELS = {
  chair: { ar: 'الرئيس', en: 'Chair' },
  vice_chair: { ar: 'نائب الرئيس', en: 'Vice Chair' },
  secretary: { ar: 'أمين السر', en: 'Secretary' },
  committee_administrator: { ar: 'مدير اللجنة', en: 'Committee Administrator' },
  member: { ar: 'عضو', en: 'Member' },
  observer: { ar: 'مراقب', en: 'Observer' },
  advisor: { ar: 'مستشار', en: 'Advisor' },
  alternate: { ar: 'بديل', en: 'Alternate' },
  lead: { ar: 'قائد المجموعة', en: 'Work group lead' },
  deputy_lead: { ar: 'نائب قائد المجموعة', en: 'Deputy lead' },
  contributor: { ar: 'مساهم', en: 'Contributor' },
};

const DAY_MS = 86400000;

export function todayISO(now) {
  return (now ? new Date(now) : new Date()).toISOString().slice(0, 10);
}

export function addDaysISO(isoDate, days) {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `fromISO` to `toISO`. Negative = the target date has passed. */
export function dayDiff(fromISO, toISO) {
  const a = Date.parse(`${String(fromISO).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${String(toISO).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / DAY_MS);
}

/**
 * Classify one action against the reminder window.
 * Returns null when there is nothing to raise today (closed, no deadline, or beyond the window).
 */
export function classifyAction(action, options) {
  const today = options?.today || todayISO();
  const windowDays = options?.windowDays ?? 7;
  if (!action || !action.deadline) return null;
  if (!OPEN_ACTION_STATUSES.includes(action.status || 'assigned')) return null;
  const days = dayDiff(today, action.deadline);
  if (days === null || days > windowDays) return null;
  if (days < 0) {
    return { stage: 'overdue', days, event_type: 'action_overdue', priority: days <= -7 ? 'urgent' : 'high' };
  }
  if (days === 0) return { stage: 'due_today', days, event_type: 'action_reminder', priority: 'high' };
  return { stage: 'approaching', days, event_type: 'action_reminder', priority: days <= 2 ? 'high' : 'normal' };
}

/**
 * The escalation level an overdue action has EARNED, recomputed from its date on every run.
 * Being derived rather than incremented makes it idempotent: running twice in a day never
 * inflates the level, and a corrected deadline lowers it again.
 */
export function earnedEscalationLevel(daysOverdue) {
  if (daysOverdue >= 0) return 'none';
  const late = -daysOverdue;
  if (late <= 6) return 'priority_reminder';
  if (late <= 13) return 'owner_secretary';
  if (late <= 29) return 'chair';
  return 'escalation_authority';
}

/** Escalation only ever advances — the automatic system never lowers a level an authority applied. */
export function nextEscalationLevel(current, earned) {
  const c = ESCALATION_CHAIN.indexOf(current || 'none');
  const e = ESCALATION_CHAIN.indexOf(earned || 'none');
  if (e > c) return earned;
  return current || 'none';
}

/** At most one reminder per action per day. */
export function shouldRemind(lastReminderAt, now, minHours) {
  if (!lastReminderAt) return true;
  const last = Date.parse(lastReminderAt);
  if (Number.isNaN(last)) return true;
  return (now ? new Date(now).getTime() : Date.now()) - last >= (minHours ?? 20) * 3600000;
}

/**
 * Who is accountable for an action, resolved from STORED seat links only — never by name:
 * the owning work group's seats first (the executing team), then the committee's accountable
 * offices. An owner with no seat link is never invented: the message names them as text instead.
 */
export function resolveRecipients(params) {
  const workstreamSeats = params?.workstreamSeats || [];
  const committeeSeats = params?.committeeSeats || [];
  const seen = new Set();
  const recipients = [];
  const add = (seat, seatKind) => {
    if (!seat || !seat.user_id || seen.has(seat.user_id)) return;
    seen.add(seat.user_id);
    recipients.push({
      user_id: seat.user_id,
      name: seat.full_name_ar || seat.full_name || seat.user_email || '',
      name_en: seat.full_name || seat.full_name_ar || seat.user_email || '',
      email: seat.user_email || null,
      role: seat.role || null,
      seat_kind: seatKind,
    });
  };
  for (const s of workstreamSeats) {
    if (s.status === 'inactive' || s.status === 'ended') continue;
    add(s, 'work_group');
  }
  for (const s of committeeSeats) {
    if (!ACCOUNTABLE_OFFICE_ROLES.includes(s.role)) continue;
    if (s.status && s.status !== 'active') continue;
    add(s, 'committee_office');
  }
  return recipients.slice(0, 8);
}

const STAGE_LABEL = {
  approaching: { ar: 'اقتراب موعد التسليم', en: 'Deadline approaching' },
  due_today: { ar: 'الموعد النهائي اليوم', en: 'Deadline is today' },
  overdue: { ar: 'تجاوز الموعد النهائي', en: 'Deadline exceeded' },
};

/**
 * The formal bilingual notice. Deterministic and auditable: the text is composed from the record
 * itself, never paraphrased per send, so two recipients of the same action read the same facts.
 */
export function buildReminderMessage(params) {
  const action = params.action || {};
  const stage = params.stage || 'approaching';
  const days = params.days ?? 0;
  const label = STAGE_LABEL[stage] || STAGE_LABEL.approaching;
  const recipientName = params.recipient_name || '';
  const committeeName = params.committee_name || '';
  const titleAr = action.title_ar || action.title || '';
  const titleEn = action.title || action.title_ar || '';
  const owner = action.owner_name || '';
  const progress = Number(action.progress_percent || 0);
  const deadline = String(action.deadline || '').slice(0, 10);

  const countAr = days < 0 ? `متأخر بـ ${Math.abs(days)} يوم`
    : days === 0 ? 'الموعد النهائي اليوم'
    : `يتبقى ${days} يوم على الموعد النهائي`;
  const countEn = days < 0 ? `${Math.abs(days)} days past the deadline`
    : days === 0 ? 'the deadline is today'
    : `${days} day(s) remain`;

  const subjectAr = stage === 'overdue'
    ? `تنبيه متأخرات: «${titleAr}» ${countAr}`
    : `تنبيه موعد تسليم: «${titleAr}» — ${countAr}`;
  const subjectEn = stage === 'overdue'
    ? `Overdue notice: "${titleEn}" — ${countEn}`
    : `Deadline notice: "${titleEn}" — ${countEn}`;

  const refLinesAr = [
    `الإجراء: ${titleAr}`,
    committeeName ? `اللجنة: ${committeeName}` : null,
    action.decision_id ? `مرتبط بقرار مسجل في اللجنة` : null,
    owner ? `المسؤول المعني: ${owner}` : null,
    `الموعد النهائي: ${deadline} (${countAr})`,
    `نسبة الإنجاز المسجلة: ${progress}%`,
    stage === 'overdue' && params.escalation_label ? `مستوى المتابعة التصاعدية: ${params.escalation_label}` : null,
  ].filter(Boolean);

  const refLinesEn = [
    `Action: ${titleEn}`,
    committeeName ? `Committee: ${committeeName}` : null,
    action.decision_id ? `Linked to a recorded committee decision` : null,
    owner ? `Responsible party: ${owner}` : null,
    `Deadline: ${deadline} (${countEn})`,
    `Recorded progress: ${progress}%`,
    stage === 'overdue' && params.escalation_label ? `Escalation level: ${params.escalation_label}` : null,
  ].filter(Boolean);

  const closingAr = stage === 'overdue'
    ? 'يُرجى استكمال ما يلزم خلال المدة النظامية، أو تقديم طلب تمديد مسبب يتضمن خطة استكمال واضحة.'
    : 'يُرجى استكمال الأعمال والأدلة المطلوبة وتحديث نسبة الإنجاز قبل الموعد النهائي.';
  const closingEn = stage === 'overdue'
    ? 'Please complete the outstanding work within the statutory period, or submit a reasoned extension request with a clear completion plan.'
    : 'Please complete the required work and evidence, and update the recorded progress before the deadline.';

  const footnoteAr = 'هذا تنبيه آلي صادر عن نظام لِجان™ وفق قواعد متابعة التنفيذ المعتمدة.';
  const footnoteEn = 'This is an automated notice issued by the LIJAN™ execution follow-up rules.';

  const bodyAr = [
    recipientName ? `حضرة ${recipientName} المحترم،` : 'حضرة المسؤول المحترم،',
    '',
    `${label.ar}: ${countAr}.`,
    '',
    ...refLinesAr,
    '',
    closingAr,
    '',
    footnoteAr,
  ].join('\n');

  const bodyEn = [
    recipientName ? `Dear ${recipientName},` : 'Dear Responsible Officer,',
    '',
    `${label.en}: ${countEn}.`,
    '',
    ...refLinesEn,
    '',
    closingEn,
    '',
    footnoteEn,
  ].join('\n');

  return { subject_ar: subjectAr, subject_en: subjectEn, body_ar: bodyAr, body_en: bodyEn };
}

/**
 * The prompt for Ameen's daily follow-up digest. It receives ONLY facts the committee already
 * holds — counts, dates, progress — and is asked to state them, never to invent an assessment.
 */
export function buildFollowUpDigestPrompt(params) {
  const items = params?.items || [];
  const lines = items.map((item, index) => {
    const parts = [
      `${index + 1}. [${item.kind}] ${item.title}`,
      `الحالة: ${item.status || 'غير محددة'}`,
      `المسؤول: ${item.owner || 'غير محدد'}`,
      `الموعد: ${item.deadline || 'غير محدد'}`,
      item.progress === null || item.progress === undefined ? null : `الإنجاز: ${item.progress}%`,
      item.note ? `ملاحظة: ${item.note}` : null,
    ].filter(Boolean);
    return parts.join(' | ');
  }).join('\n');

  return [
    'أنت «أمين»، المساعد المؤسسي لنظام لِجان™ لمتابعة تنفيذ القرارات في اللجان الوطنية.',
    `اللجنة: ${params?.committee_name || ''}`,
    `تاريخ المتابعة: ${params?.today || ''}`,
    `نافذة التنبيه: ${params?.window_days ?? 7} يوم قبل الموعد النهائي.`,
    '',
    'بيانات المتابعة المسجلة في النظام:',
    lines || '(لا توجد بنود)',
    '',
    'المطلوب: موجز تنفيذي رسمي عن حالة تنفيذ القرارات في هذه اللجنة، باللغة العربية الفصحى الإدارية الرسمية، وفق الشروط:',
    '- الاستناد حصرًا إلى البيانات أعلاه، وعدم إضافة أي رقم أو جهة أو تقييم غير وارد فيها.',
    '- إذا لم تتوافر معلومة، فاذكر أنها غير مسجلة بدلًا من تقديرها.',
    '- بنية من ثلاث فقرات قصيرة: الموقف التنفيذي، المخاطر والاختناقات، والإجراء المطلوب من اللجنة.',
    '- لا يتجاوز النص 220 كلمة، وبلا عناوين فرعية أو تنسيق أو رموز أو نقاط مرقمة.',
    '- صيغة المخاطبة مؤسسية رسمية موجّهة إلى اللجنة.',
    '',
    'وأعد أيضًا عنوانًا موجزًا للموجز بالعربية والإنجليزية، وترجمة موجزة للنص بالإنجليزية بنفس الوقائع.',
    'أعد النتيجة بصيغة JSON وفق المخطط المحدد.',
  ].join('\n');
}

/** Deterministic fallback summary so a failed model call never breaks the follow-up cycle. */
export function buildFollowUpFallback(params) {
  const items = params?.items || [];
  const overdue = items.filter((i) => i.kind === 'action' && i.days < 0).length;
  const approaching = items.filter((i) => i.kind === 'action' && i.days >= 0).length;
  const gaps = items.filter((i) => i.kind === 'execution_gap').length;
  const decisions = items.filter((i) => i.kind === 'decision').length;
  const headlineAr = `موجز متابعة التنفيذ — ${params?.committee_name || ''}`;
  const headlineEn = `Execution follow-up brief — ${params?.committee_name || ''}`;
  const briefAr = [
    `الموقف التنفيذي: رُصد في ${params?.today || ''} عدد ${approaching} إجراءً يقترب موعده النهائي، و${overdue} إجراءً تجاوز موعده النهائي، و${decisions} قرارًا قيد التنفيذ، و${gaps} قرارًا قيد التنفيذ دون إجراءات مرتبطة مسجلة.`,
    'المخاطر والاختناقات: يتعذر استعراض التفاصيل السردية لعدم توافر الموجز المولَّد، وتُعرض البنود التفصيلية في سجل الإجراءات والقرارات باللجنة.',
    'الإجراء المطلوب من اللجنة: مراجعة الإجراءات المتأخرة والقرارات قيد التنفيذ، وتحديث نسب الإنجاز والأدلة، وتحديد ما يلزم من تمديدات مسببة.',
  ].join('\n\n');
  const briefEn = [
    `Execution status: as of ${params?.today || ''}, ${approaching} action(s) are approaching their deadline, ${overdue} action(s) are past due, ${decisions} decision(s) are in execution, and ${gaps} executing decision(s) have no linked actions recorded.`,
    'Risks: a narrative assessment is unavailable because the generated brief did not return. Item level detail is available in the committee action and decision registers.',
    'Required from the committee: review overdue actions and executing decisions, update progress and evidence, and determine any reasoned extensions required.',
  ].join('\n\n');
  return { headline_ar: headlineAr, headline_en: headlineEn, brief_ar: briefAr, brief_en: briefEn, generated: false };
}

export const FOLLOW_UP_SCHEMA = {
  type: 'object',
  properties: {
    headline_ar: { type: 'string' },
    headline_en: { type: 'string' },
    brief_ar: { type: 'string' },
    brief_en: { type: 'string' },
  },
  required: ['headline_ar', 'headline_en', 'brief_ar', 'brief_en'],
};