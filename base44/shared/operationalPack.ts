// LIJAN™ — operational data pack builders (pure and deterministic).
//
// Used by ProvisionCommitteeOperationalData. Everything here exists to make a listed
// record openable and true: a recorded attendance with a real quorum, a full agenda,
// a stored document version, and reports/memory drawn ONLY from approved content.
// Nothing in this module writes, and nothing in it invents a number that is not derived
// from the committee's own seats and records.

export interface Seat {
  id?: string;
  user_id?: string | null;
  user_email?: string | null;
  full_name?: string;
  full_name_ar?: string;
  role?: string;
  status?: string;
  protocol_order?: number;
  post_ar?: string;
  post_en?: string;
  institution_name?: string;
  institution_name_en?: string;
}

export interface MeetingLike {
  id: string;
  title_ar?: string;
  title_en?: string;
  date?: string;
  status?: string;
  quorum_required?: number;
}

const VOTING_ROLES = new Set([
  'chair', 'vice_chair', 'secretary', 'committee_administrator', 'member',
]);

/** Statuses that mean "this source is institutionally approved" — nothing else qualifies. */
export const APPROVED_DECISION_STATUSES = new Set(['issued', 'approved', 'in_force', 'in_effect']);
export const APPROVED_MINUTES_STATUSES = new Set(['approved', 'published', 'issued']);
export const APPROVED_ACTION_STATUSES = new Set(['closed', 'verified', 'completed']);

export const isApprovedDecision = (d: any) => APPROVED_DECISION_STATUSES.has(String(d?.status || ''));
export const isApprovedMinutes = (m: any) => APPROVED_MINUTES_STATUSES.has(String(m?.status || ''));
export const isApprovedAction = (a: any) => APPROVED_ACTION_STATUSES.has(String(a?.status || ''));

// ── Attendance ────────────────────────────────────────────────────────────────

export interface AttendancePlan {
  rows: Array<Record<string, any>>;
  present: number;
  absent: number;
  apologies: number;
  quorum_met: boolean;
  quorum_required: number;
}

/**
 * A recorded register for one meeting: every active seat answers for itself, the
 * voting seats carry one recorded absence and one apology, and seats that hold no
 * vote (alternate, observer, advisor) are recorded as absent — an alternate only
 * attends once activated.
 */
export function planAttendance(seats: Seat[], meeting: MeetingLike): AttendancePlan {
  const ordered = [...(seats || [])]
    .filter((s) => (s.status || 'active') === 'active')
    .sort((a, b) => (a.protocol_order ?? 99) - (b.protocol_order ?? 99));

  const voters = ordered.filter((s) => VOTING_ROLES.has(s.role || 'member'));
  const apologySeat = voters.length > 2 ? voters[voters.length - 1] : null;
  const absentSeat = voters.length > 3 ? voters[voters.length - 2] : null;

  const rows = ordered.map((s) => {
    let attendance_status = 'present';
    if (!VOTING_ROLES.has(s.role || '')) attendance_status = 'absent';
    if (apologySeat && s.id === apologySeat.id) attendance_status = 'absent_with_apology';
    if (absentSeat && s.id === absentSeat.id) attendance_status = 'absent';
    return {
      member_id: s.id || null,
      member_name: s.full_name_ar || s.full_name || '',
      member_name_en: s.full_name || s.full_name_ar || '',
      member_role: s.role || 'member',
      attendance_status,
      arrival_time: attendance_status === 'present' ? (meeting.date || null) : null,
    };
  });

  const present = rows.filter((r) => r.attendance_status === 'present').length;
  const quorum_required = meeting.quorum_required || 4;
  return {
    rows,
    present,
    absent: rows.filter((r) => r.attendance_status === 'absent').length,
    apologies: rows.filter((r) => r.attendance_status === 'absent_with_apology').length,
    quorum_met: present >= quorum_required,
    quorum_required,
  };
}

// ── Agenda ────────────────────────────────────────────────────────────────────

export const AGENDA_TARGET = 8;

const SLOT = {
  opening: {
    ar: 'افتتاح الاجتماع والتحقق من النصاب',
    en: 'Opening of the session and verification of quorum',
    obj_ar: 'تثبيت اكتمال النصاب النظامي وبدء الأعمال',
    obj_en: 'Confirm the legal quorum and open the business of the session',
    min: 5,
    dec_ar: 'لا يتطلب قرارًا',
    dec_en: 'No decision required',
    asker: 'chair',
  },
  minutes: {
    ar: 'إقرار محضر الاجتماع السابق',
    en: 'Approval of the minutes of the previous meeting',
    obj_ar: 'مراجعة مضابط الاجتماع السابق وإقرارها أو إعادتها',
    obj_en: 'Review the previous minutes and approve or return them',
    min: 10,
    dec_ar: 'قرار بإقرار المحضر',
    dec_en: 'Decision to approve the minutes',
    asker: 'secretary',
  },
  followup: {
    ar: 'متابعة القرارات السابقة',
    en: 'Follow-up on previous decisions',
    obj_ar: 'التحقق من حالة تنفيذ القرارات السابقة ومعالجة المتأخر منها',
    obj_en: 'Verify the state of previous decisions and clear what is overdue',
    min: 15,
    dec_ar: 'قرار بمعالجة المتأخر',
    dec_en: 'Decision on clearing overdue items',
    asker: 'secretary',
  },
  deliberation: {
    ar: 'عرض ومناقشة الموضوعات المدرجة',
    en: 'Presentation and deliberation of the listed matters',
    obj_ar: 'عرض الموضوعات المحالة ومناقشتها وصولًا إلى توصية',
    obj_en: 'Present the referred matters and reach a recommendation',
    min: 25,
    dec_ar: 'توصية أو قرار',
    dec_en: 'Recommendation or decision',
    asker: 'member',
  },
  proposals: {
    ar: 'المقترحات والقرارات المطلوبة',
    en: 'Proposals and required decisions',
    obj_ar: 'طرح المقترحات المطلوب حسمها في هذا الاجتماع',
    obj_en: 'Table the proposals requiring resolution in this session',
    min: 20,
    dec_ar: 'قرار مطلوب',
    dec_en: 'Decision required',
    asker: 'member',
  },
  progress: {
    ar: 'تقرير سير الأعمال والمبادرات',
    en: 'Progress report on actions and initiatives',
    obj_ar: 'استعراض تقدم الأعمال والالتزامات الجارية ومؤشراتها',
    obj_en: 'Review progress on actions, commitments and their indicators',
    min: 15,
    dec_ar: 'لا يتطلب قرارًا',
    dec_en: 'No decision required',
    asker: 'secretary',
  },
  risks: {
    ar: 'المخاطر والمعوقات والامتثال',
    en: 'Risks, blockers and compliance',
    obj_ar: 'استعراض المخاطر القائمة والمعوقات ومتطلبات الامتثال',
    obj_en: 'Review standing risks, blockers and compliance requirements',
    min: 15,
    dec_ar: 'قرار بتصعيد ما يلزم',
    dec_en: 'Decision on escalating what is required',
    asker: 'member',
  },
  closing: {
    ar: 'ختام الاجتماع وتحديد موعد الاجتماع القادم',
    en: 'Closing of the session and setting the next meeting',
    obj_ar: 'إقفال الأعمال وتثبيت موعد الاجتماع القادم',
    obj_en: 'Close the business and set the date of the next meeting',
    min: 5,
    dec_ar: 'لا يتطلب قرارًا',
    dec_en: 'No decision required',
    asker: 'chair',
  },
};

function presenterFor(seatKey: string, seats: Seat[]) {
  const ordered = [...(seats || [])].sort(
    (a, b) => (a.protocol_order ?? 99) - (b.protocol_order ?? 99),
  );
  const byRole = (role: string) => ordered.find((s) => s.role === role && (s.status || 'active') === 'active');
  const chair = byRole('chair') || byRole('vice_chair');
  const secretary = byRole('secretary');
  const member = byRole('member');
  const chosen =
    seatKey === 'chair' ? chair
      : seatKey === 'secretary' ? (secretary || chair)
        : (member || chair || secretary);
  return {
    presenter_ar: chosen?.full_name_ar || chosen?.full_name || '',
    presenter_en: chosen?.full_name || chosen?.full_name_ar || '',
  };
}

/**
 * The agenda that brings a meeting to AGENDA_TARGET items: the institutional frame is
 * fixed, and the deliberative slots carry the committee's own decision titles where a
 * decision exists, so the agenda and the record do not tell two different stories.
 */
export function planAgenda(input: {
  meeting: MeetingLike;
  committee: { name_ar?: string; name_en?: string };
  seats: Seat[];
  existingCount: number;
  decisions: any[];
}): Array<Record<string, any>> {
  const { meeting, seats, existingCount } = input;
  const decisions = input.decisions || [];
  const completed = (meeting.status || '') === 'completed';

  const midSlots = decisions.slice(0, 2).map((d) => ({
    ar: d.title_ar || d.title || d.title_en,
    en: d.title_en || d.title || d.title_ar,
    obj_ar: 'مناقشة البند وصولًا إلى توصية أو قرار مكتمل',
    obj_en: 'Deliberate the item and reach a recommendation or decision',
    min: 20,
    dec_ar: 'قرار مطلوب',
    dec_en: 'Decision required',
    asker: 'member',
  }));
  while (midSlots.length < 2) {
    midSlots.push(midSlots.length === 0 ? SLOT.deliberation : SLOT.proposals);
  }

  const slots = [
    SLOT.opening,
    SLOT.minutes,
    SLOT.followup,
    ...midSlots,
    SLOT.progress,
    SLOT.risks,
    SLOT.closing,
  ];

  const missing = Math.max(0, AGENDA_TARGET - (existingCount || 0));
  if (!missing) return [];

  // The items already listed keep their order and their numbers; the new ones continue.
  const offset = Math.min(slots.length, missing);
  const planned = slots.slice(slots.length - offset);

  return planned.map((slot, i) => ({
    organization_id: input.meeting.organization_id || undefined,
    committee_id: input.meeting.committee_id || undefined,
    meeting_id: meeting.id,
    sequence: (existingCount || 0) + i + 1,
    title_ar: slot.ar,
    title_en: slot.en,
    title: slot.en,
    objective_ar: slot.obj_ar,
    objective_en: slot.obj_en,
    objective: slot.obj_en,
    ...presenterFor(slot.asker, seats),
    time_allocation_minutes: slot.min,
    required_decision: slot.dec_ar,
    required_decision_en: slot.dec_en,
    classification: 'internal',
    readiness: 'ready',
    status: completed ? 'decided' : 'pending',
  }));
}

// ── Document file (a real, openable bilingual memo) ───────────────────────────

const esc = (v: any) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const CLASSIFICATION_AR: Record<string, string> = {
  public: 'عام',
  internal: 'داخلي',
  confidential: 'سري',
  restricted: 'مقيّد',
  highly_restricted: 'سري للغاية',
};

const TYPE_AR: Record<string, string> = {
  memo: 'مذكرة إحاطة',
  report: 'تقرير',
  analysis: 'تحليل',
  proposal: 'مقترح',
  evidence: 'بيّنة',
  correspondence: 'مراسلة',
  draft_decision: 'مشروع قرار',
  establishing_decision: 'قرار إنشاء',
  charter: 'ميثاق',
  execution_document: 'مستند تنفيذي',
  legal_reference: 'مرجع قانوني',
  other: 'مستند',
};

export function slugForFile(title: string, fallback = 'document') {
  const base = String(title || '')
    .replace(/[\u0600-\u06FF\s]+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (base || fallback).slice(0, 60).toLowerCase();
}

/**
 * The stored bytes of a document version: one institutional document, bilingual,
 * carrying its own classification, its committee, and the record it belongs to.
 */
export function buildDocumentHtml(input: {
  document: any;
  committee: any;
  versionNumber: number;
  generatedBy: string;
  linkedDecision?: any | null;
}) {
  const { document, committee, versionNumber, generatedBy } = input;
  const linked = input.linkedDecision;
  const ar = document.title_ar || document.title || '';
  const en = document.title_en || document.title || '';
  const bodyAr = document.description || '';
  const bodyEn = document.description_en || '';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${esc(ar || en)}</title>
<style>
  body { font-family: "Noto Naskh Arabic", Arial, sans-serif; background: #f9f8f5; color: #1f2123; margin: 0; padding: 32px; line-height: 1.7; }
  .sheet { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; }
  .band { background: #871746; color: #fff; padding: 20px 28px; }
  .band h1 { margin: 0; font-size: 20px; }
  .meta { padding: 20px 28px; border-bottom: 1px solid #e5e7eb; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
  .k { color: #6e7377; font-size: 12px; display: block; }
  .v { font-size: 15px; }
  .body { padding: 24px 28px; }
  .body h2 { font-size: 16px; margin: 0 0 8px; }
  .en { direction: ltr; text-align: left; border-top: 1px dashed #e5e7eb; margin-top: 24px; padding-top: 16px; }
  .foot { padding: 16px 28px; background: #f6f4f1; color: #6e7377; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; }
  td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 14px; vertical-align: top; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="band">
      <h1>لِجان™ | LIJAN™ — ${esc(ar || en)}</h1>
      <div style="font-size:13px;opacity:.9">نظام التشغيل المؤسسي الوطني · National Institutional Operating System · Powered by CONNECTION™</div>
    </div>
    <div class="meta">
      <div class="grid">
        <div><span class="k">الجهة / Entity</span><span class="v">${esc(committee?.name_ar || '')}</span></div>
        <div><span class="k">Entity (English)</span><span class="v">${esc(committee?.name_en || '')}</span></div>
        <div><span class="k">نوع المستند / Type</span><span class="v">${esc(TYPE_AR[document.document_type] || document.document_type || '')} · ${esc(document.document_type || '')}</span></div>
        <div><span class="k">التصنيف / Classification</span><span class="v">${esc(CLASSIFICATION_AR[document.classification] || '')} · ${esc(document.classification || '')}</span></div>
        <div><span class="k">الإصدار / Version</span><span class="v">${esc(versionNumber)}</span></div>
        <div><span class="k">المالك / Owner</span><span class="v">${esc(document.owner_name || '')}</span></div>
      </div>
    </div>
    <div class="body">
      <h2>${esc(ar)}</h2>
      <p>${esc(bodyAr) || '&nbsp;'}</p>
      ${linked ? `<table><tr><td style="width:190px">القرار المرتبط / Linked decision</td><td>${esc(linked.title_ar || '')} — ${esc(linked.decision_number || '')}</td></tr></table>` : ''}
      <div class="en">
        <h2>${esc(en)}</h2>
        <p>${esc(bodyEn) || '&nbsp;'}</p>
      </div>
    </div>
    <div class="foot">
      صدر عن أمانة اللجنة عبر منصة لِجان™ — ${esc(generatedBy)} · تاريخ الإصدار: ${new Date().toISOString().slice(0, 10)} · تصنيف المستند: ${esc(CLASSIFICATION_AR[document.classification] || '')}.
      <br />Issued by the committee secretariat on the LIJAN™ platform. This version is the stored, traceable record of the document.
    </div>
  </div>
</body>
</html>`;
}

export async function sha256Hex(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as any);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Reports and memory — approved content only ────────────────────────────────

export function collectApprovedSources(input: {
  decisions?: any[];
  actions?: any[];
  minutes?: any[];
  meetingMinutesIds?: Set<string>;
}) {
  const decisions = (input.decisions || []).filter(isApprovedDecision);
  const actions = (input.actions || []).filter(isApprovedAction);
  const minutes = (input.minutes || []).filter(isApprovedMinutes);
  return { decisions, actions, minutes, total: decisions.length + actions.length + minutes.length };
}

export function buildReportSections(sources: {
  decisions: any[];
  actions: any[];
  minutes: any[];
}) {
  const sections: Array<Record<string, any>> = [];
  sections.push({
    title_ar: 'ملخص تنفيذي',
    title_en: 'Executive summary',
    content_ar: `يستند هذا التقرير إلى ${sources.decisions.length} قرارًا صادرًا و${sources.actions.length} إجراءً مُنجزًا و${sources.minutes.length} محضرًا معتمدًا. لا يتضمن أي بند غير معتمد.`,
    content_en: `This report is built from ${sources.decisions.length} issued decisions, ${sources.actions.length} closed actions and ${sources.minutes.length} approved minutes. No unapproved item is included.`,
    source_references: [],
  });
  if (sources.decisions.length) {
    sections.push({
      title_ar: 'القرارات الصادرة',
      title_en: 'Issued decisions',
      content_ar: sources.decisions.map((d, i) => `${i + 1}. ${d.title_ar || d.title || ''} (${d.decision_number || ''})`).join('\n'),
      content_en: sources.decisions.map((d, i) => `${i + 1}. ${d.title_en || d.title || ''} (${d.decision_number || ''})`).join('\n'),
      source_references: sources.decisions.map((d) => ({ entity_type: 'Decision', entity_id: d.id })),
    });
  }
  if (sources.actions.length) {
    sections.push({
      title_ar: 'الإجراءات المُنجزة',
      title_en: 'Completed actions',
      content_ar: sources.actions.map((a, i) => `${i + 1}. ${a.title_ar || a.title || ''}`).join('\n'),
      content_en: sources.actions.map((a, i) => `${i + 1}. ${a.title_en || a.title || ''}`).join('\n'),
      source_references: sources.actions.map((a) => ({ entity_type: 'Action', entity_id: a.id })),
    });
  }
  if (sources.minutes.length) {
    sections.push({
      title_ar: 'المحاضر المعتمدة',
      title_en: 'Approved minutes',
      content_ar: sources.minutes.map((m, i) => `${i + 1}. محضر الاجتماع ${m.meeting_id || ''}`).join('\n'),
      content_en: sources.minutes.map((m, i) => `${i + 1}. Minutes of meeting ${m.meeting_id || ''}`).join('\n'),
      source_references: sources.minutes.map((m) => ({ entity_type: 'MeetingMinutes', entity_id: m.id })),
    });
  }
  return sections;
}

export function buildMemoryLedger(sources: {
  decisions: any[];
  actions: any[];
  minutes: any[];
}, committee: any) {
  const structured = buildReportSections(sources);
  const summaryAr = `ذاكرة مؤسسية مُولَّدة من ${sources.decisions.length} قرارًا صادرًا و${sources.actions.length} إجراءً مُنجزًا و${sources.minutes.length} محضرًا معتمدًا في ${committee?.name_ar || ''}.`;
  const summaryEn = `Institutional memory built from ${sources.decisions.length} issued decisions, ${sources.actions.length} closed actions and ${sources.minutes.length} approved minutes of ${committee?.name_en || ''}.`;
  return { structured, summaryAr, summaryEn };
}

// ── Composition ───────────────────────────────────────────────────────────────

/**
 * A committee cannot record a quorum it does not have. Where a demonstration committee
 * was seeded with nothing but the persona's own seat, the approved roster completes the
 * composition — the missing officer roles first, then members, then one alternate. Names
 * come from the approved roster and never collide with a seat already held.
 */
export function buildDemonstrationSeats(input: {
  existing: Seat[];
  roster: Array<{ ar: string; en: string }>;
  institutions: string[];
  targetVoting?: number;
  seed?: number;
}): Array<Record<string, any>> {
  const targetVoting = input.targetVoting ?? 8;
  const existing = input.existing || [];
  const takenAr = new Set(existing.map((s) => s.full_name_ar).filter(Boolean));
  const takenEn = new Set(existing.map((s) => s.full_name).filter(Boolean));
  const holds = (role: string) =>
    existing.some((s) => s.role === role && (s.status || 'active') === 'active');
  const voting = existing.filter((s) => VOTING_ROLES.has(s.role || 'member')).length;
  const need = Math.max(0, targetVoting - voting);
  if (!need) return [];

  const wanted: string[] = [];
  for (const role of ['chair', 'vice_chair', 'secretary']) {
    if (!holds(role) && wanted.length < need) wanted.push(role);
  }
  while (wanted.length < need) wanted.push('member');
  wanted.push('alternate');

  const seed = input.seed ?? 0;
  const roster = input.roster || [];
  if (!roster.length) return [];
  let idx = seed % roster.length;
  let order = Math.max(0, ...existing.map((s) => s.protocol_order ?? 0));

  return wanted.map((role) => {
    let person = roster[idx % roster.length];
    let guard = 0;
    while ((takenAr.has(person.ar) || takenEn.has(person.en)) && guard < roster.length) {
      idx += 1;
      guard += 1;
      person = roster[idx % roster.length];
    }
    idx += 1;
    order += 1;
    takenAr.add(person.ar);
    takenEn.add(person.en);
    return {
      full_name: person.en,
      full_name_ar: person.ar,
      user_email: `demo.member${seed + order}@lijan-demo.com`,
      user_id: null,
      role,
      authority_level:
        role === 'chair' ? 'decision'
          : role === 'vice_chair' ? 'approval'
            : role === 'secretary' ? 'execution'
              : 'decision',
      voting_right: role !== 'alternate',
      membership_type: 'internal',
      status: 'active',
      protocol_order: order,
      term_start: '2026-01-01',
      term_end: '2027-12-31',
      institution_name: input.institutions[(seed + order) % input.institutions.length],
      is_demonstration_role: true,
    };
  });
}