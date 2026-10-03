// LIJAN™ — Dr. Hamad demonstration experience (presentation + context model).
//
// ONE person, ONE primary organization (Qatar Development Bank), SEVEN scoped committee
// memberships across THREE institutional contexts. This module holds the copy and the
// context model only — identity, memberships and authority are always resolved from the
// persisted records by the backend (RepairDrHamadDemoExperienceV3 / GetDrHamadExperience).
//
// It never introduces a second persona and never falls back to another demo identity.

import {
  DR_HAMAD_COMMITTEES,
  DR_HAMAD_ORGS,
  DR_HAMAD_PERSONA,
  ROLE_LABELS,
} from './drHamadDataset.ts';

// Context order — primary organization first, then national membership, then the external
// synthetic role. The three contexts are AFFILIATIONS, never three employers.
export const DR_HAMAD_CONTEXT_ORDER = ['QDB', 'NATIONAL', 'ELAN'];

export const DR_HAMAD_SUMMARY = {
  ar: 'جهة أساسية واحدة • 7 لجان • 3 سياقات مؤسسية • 4 أدوار مختلفة',
  en: '1 Primary Organization • 7 Committees • 3 Institutional Contexts • 4 Different Roles',
};

// Top exploration banner — the persona name is always injected, never hardcoded.
export const DR_HAMAD_BANNER = {
  ar: 'أنت الآن تستكشف المنصة بشخصية {name}',
  en: 'You are now exploring the platform as {name}',
  note_ar: 'بيانات تجريبية — غير صالحة للاستخدام الرسمي',
  note_en: 'Synthetic demonstration data — not for official use',
};

// Landing copy (§13) — primary organization shown directly below the name.
export const DR_HAMAD_LANDING_COPY = {
  greeting_ar: 'مرحبًا، الدكتور حمد سالم مجيغير',
  greeting_en: 'Welcome, Dr. Hamad Salem Majeegheer',
  org_ar: 'بنك قطر للتنمية',
  org_en: 'Qatar Development Bank',
  intro_ar: 'تعمل عبر 7 لجان وطنية ومؤسسية بأدوار مختلفة. يعرض لك «أمين» ما يحتاج إلى انتباهك وفق اللجنة والدور الحالي.',
  intro_en: 'You work across 7 national and institutional committees in different roles. «Ameen» shows what needs your attention based on the current committee and role.',
  quick_actions: [
    { key: 'attention', ar: 'عرض ما يحتاج انتباهي', en: 'Show what needs my attention' },
    { key: 'national', ar: 'متابعة اللجنة الوطنية', en: 'Follow the National Committee', committee_public_id: 'DEMO-COMM-NATIONAL-SME' },
    { key: 'elan', ar: 'فتح اللجنة التنفيذية', en: 'Open the Executive Committee', committee_public_id: 'DEMO-COMM-ELAN-EXEC' },
    { key: 'documents', ar: 'مراجعة المستندات', en: 'Review documents' },
    { key: 'ameen', ar: 'اسأل «أمين»', en: 'Ask «Ameen»' },
  ],
};

// §7 — the seven memberships must produce exactly this role tally. Organization-level
// labels (owner / admin / manager) are never counted as committee roles.
export const DR_HAMAD_ROLE_COUNTS = { chair: 2, vice_chair: 1, member: 3, secretary: 1 };

export const DR_HAMAD_ROLE_TALLY = {
  ar: ['رئيس لجنتين', 'نائب رئيس لجنة واحدة', 'عضو في ثلاث لجان', 'أمين سر لجنة واحدة'],
  en: ['Chair of two committees', 'Vice-Chair of one committee', 'Member of three committees', 'Committee Secretary of one committee'],
};

// Demonstrated role boundaries (§11) — stated as data so the backend and the UI agree.
export const DR_HAMAD_ROLE_BOUNDARIES = {
  chair: {
    ar: 'اعتماد جدول الأعمال والبت في القرارات واعتماد المحاضر داخل هذه اللجنة فقط.',
    en: 'Approve the agenda, decide on proposals and approve minutes within this committee only.',
  },
  vice_chair: {
    ar: 'مراجعة الجاهزية ودعم رئيس اللجنة والتوصية — لا صلاحيات رئيس إلا بتفويض نافذ.',
    en: 'Review readiness, support the Chair and recommend — no Chair powers without an active delegation.',
  },
  member: {
    ar: 'المراجعة والتوصية وتقديم الأدلة — دون صلاحية اعتماد القرار.',
    en: 'Review, recommend and provide evidence — no decision-approval authority.',
  },
  secretary: {
    ar: 'تجهيز الأجندة والمحاضر وحزمة الاجتماع ومتابعة الإجراءات — دون اعتماد القرار.',
    en: 'Prepare the agenda, minutes and meeting pack and follow up on actions — never decision approval.',
  },
};

// Workstream topics per committee — used for idempotent demonstration content seeding and
// for the agenda of the seeded meetings. Clearly synthetic unless the committee is
// classified as source-based demonstration.
export const DR_HAMAD_TOPICS = {
  digital_transformation: {
    ar: ['خطة التحول الرقمي 2026', 'حوكمة الذكاء المؤسسي', 'مؤشرات جاهزية البيانات'],
    en: ['Digital transformation plan 2026', 'Institutional intelligence governance', 'Data readiness indicators'],
  },
  sme_finance_steering: {
    ar: ['محفظة تمويل الشركات الصغيرة والمتوسطة', 'سياسات الضمانات والتسعير', 'مؤشرات الإقراض الربعية'],
    en: ['SME finance portfolio', 'Guarantee and pricing policies', 'Quarterly lending indicators'],
  },
  investment_partnerships: {
    ar: ['فرص استثمارية قيد التقييم', 'الشراكات الاستراتيجية', 'المواءمة مع الأولويات الوطنية'],
    en: ['Investment opportunities under review', 'Strategic partnerships', 'Alignment with national priorities'],
  },
  risk_continuity: {
    ar: ['سجل المخاطر المؤسسية', 'استمرارية الخدمات الحيوية', 'سيناريوهات التعافي'],
    en: ['Institutional risk register', 'Continuity of critical services', 'Recovery scenarios'],
  },
  innovation_services: {
    ar: ['أجندة الابتكار', 'تطوير الخدمات الرقمية', 'حزمة الاجتماع ومتابعة الإجراءات'],
    en: ['Innovation agenda', 'Digital service development', 'Meeting pack and action follow-up'],
  },
  national_sme: {
    ar: ['توحيد تعريف الشركات الصغيرة والمتوسطة', 'النفاذ إلى الأسواق', 'التمويل ورأس المال والمعرفة'],
    en: ['Unified SME definition', 'Access to markets', 'Finance, capital and knowledge'],
  },
  elan_executive: {
    ar: ['أداء المجموعة والتوقعات المالية', 'الموافقات التنفيذية', 'متابعة قرارات المجلس'],
    en: ['Group performance and financial forecast', 'Executive approvals', 'Board decision follow-up'],
  },
};

/** One committee definition by public id. */
export function drHamadCommittee(publicId) {
  return DR_HAMAD_COMMITTEES.find((c) => c.public_id === publicId) || null;
}

/** Owning context (organization) of one committee. */
export function drHamadOwningOrg(publicId) {
  const def = drHamadCommittee(publicId);
  if (!def) return null;
  return DR_HAMAD_ORGS[def.owning_org] || null;
}

/**
 * §10 — the context indicator: primary organization ← owning organization ← committee ← current role.
 * It explains the relationship; it never grants access.
 */
export function drHamadContextPath(publicId, lang = 'ar') {
  const def = drHamadCommittee(publicId);
  if (!def) return null;
  const owning = DR_HAMAD_ORGS[def.owning_org];
  const isPrimaryOwned = def.owning_org === 'QDB';
  const own = lang === 'ar' ? owning.context.path_label_ar : owning.context.path_label_en;
  const role = def.path_role_label_ar && lang === 'ar'
    ? def.path_role_label_ar
    : def.path_role_label_en && lang === 'en'
      ? def.path_role_label_en
      : (lang === 'ar' ? ROLE_LABELS[def.role].ar : ROLE_LABELS[def.role].en);
  const base = lang === 'ar' ? DR_HAMAD_PERSONA.primary_org_ar : DR_HAMAD_PERSONA.primary_org_en;
  return {
    parts: [
      base,
      // Primary-organization committees read QDB ← QDB (his own organization owns them).
      own,
      lang === 'ar' ? def.name_ar : def.name_en,
      role,
    ],
    // The role as displayed in the committee itself (synthetic wording for the ELAN role).
    role_label: lang === 'ar'
      ? (def.role_label_ar || ROLE_LABELS[def.role].ar)
      : (def.role_label_en || ROLE_LABELS[def.role].en),
    owns_primary: isPrimaryOwned,
    synthetic_role: def.synthetic_role === true,
  };
}

/** The three contextual sections, in order, with their own badges and copy. */
export function drHamadSections() {
  return DR_HAMAD_CONTEXT_ORDER.map((key, index) => {
    const org = DR_HAMAD_ORGS[key];
    return {
      key,
      order: index + 1,
      kind: org.context.kind,
      public_id: org.public_id,
      name_ar: org.name_ar,
      name_en: org.name_en,
      title_ar: org.context.title_ar,
      title_en: org.context.title_en,
      badges: org.context.badges,
      section_label_ar: org.context.section_label_ar,
      section_label_en: org.context.section_label_en,
      notice_ar: org.context.notice_ar || null,
      notice_en: org.context.notice_en || null,
      committee_public_ids: DR_HAMAD_COMMITTEES
        .filter((c) => c.owning_org === key)
        .map((c) => c.public_id),
    };
  });
}

/** Role tally computed from persisted rows — never from a hardcoded list. */
export function tallyRoles(rows) {
  const counts = { chair: 0, vice_chair: 0, member: 0, secretary: 0, other: 0 };
  for (const row of (rows || [])) {
    if (counts[row.role] === undefined) counts.other += 1;
    else counts[row.role] += 1;
  }
  return counts;
}