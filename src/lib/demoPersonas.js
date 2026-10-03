// LIJAN™ — governed demo persona registry (frontend mirror).
// Mirrors base44/shared/demoPersonas.ts — keep both in sync if either changes.
//
// Every demonstration persona resolves through ONE identity path: a virtual user id
// (DEMO-USER-*) plus a demo dataset key. The server resolves memberships, roles and
// organizations from those two keys; the UI carries only the session.
//
// There is NO silent fallback: an unknown key resolves to null and the caller must refuse.

export const DEMO_PERSONAS = {
  DR_HAMAD_MAJEEGHEER: {
    key: 'DR_HAMAD_MAJEEGHEER',
    slug: 'dr-hamad',
    persona_id: 'demo-dr-hamad-majeegheer',
    user_id: 'DEMO-USER-DR-HAMAD-MAJEEGHEER',
    dataset: 'DR_HAMAD_GOVERNED_DEMO_V1',
    email: 'dr.hamad.majeegheer.demo@lijan.example',
    name_ar: 'الدكتور حمد سالم مجيغير',
    name_en: 'Dr. Hamad Salem Majeegheer',
    job_title_ar: 'قيادي تنفيذي — بنك قطر للتنمية',
    job_title_en: 'Executive Leader — Qatar Development Bank',
    job_title_is_demo_wording: true,
    primary_org_ar: 'بنك قطر للتنمية',
    primary_org_en: 'Qatar Development Bank',
    primary_org_abbr: 'QDB',
    primary_org_public_id: 'DEMO-ORG-QDB',
    account_classification_ar: 'شخصية عرض تجريبية محكومة',
    account_classification_en: 'Governed Synthetic Demonstration Persona',
  },
  FAHAD_AL_FIHAIDI: {
    key: 'FAHAD_AL_FIHAIDI',
    slug: 'auditor',
    persona_id: 'demo-fahad-al-fihaidi',
    user_id: 'DEMO-USER-FAHAD-AL-FIHAIDI',
    dataset: 'FAHAD_QATAR_GOVERNMENT_DEMO_V2',
    email: 'F.alfihaidi@lijan.com',
    name_ar: 'فهد الفهيدي',
    name_en: 'Fahad Al-Fihaidi',
    job_title_ar: 'مدير التدقيق',
    job_title_en: 'Director of Audit',
    job_title_is_demo_wording: true,
    primary_org_ar: 'مجلس التدقيق والمراجعة',
    primary_org_en: 'Audit and Review Council',
    primary_org_public_id: 'DEMO-ORG-AUDIT-COUNCIL',
    account_classification_ar: 'شخصية عرض تجريبية',
    account_classification_en: 'Demonstration Persona',
  },
};

// The canonical demonstration experience is Dr. Hamad's.
export const DEFAULT_DEMO_PERSONA_KEY = 'DR_HAMAD_MAJEEGHEER';

/** Resolve a persona by key. Unknown or missing → null (never another persona). */
export function resolveDemoPersona(key) {
  if (!key || typeof key !== 'string') return null;
  return DEMO_PERSONAS[key] || null;
}

/** Resolve a persona by its stable route slug, e.g. /explore/dr-hamad → slug 'dr-hamad'. */
export function resolvePersonaBySlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  const wanted = slug.trim().toLowerCase();
  return Object.values(DEMO_PERSONAS).find((p) => p.slug === wanted) || null;
}

// ── Role lenses ──────────────────────────────────────────────────────────────
// A role lens is NOT a second persona and NOT a second dataset. It enters the SAME
// governed session and opens the committee where that persona ALREADY holds the role
// in the provisioned dataset. The lens only decides where the session opens — the
// authority shown is always the one the server resolves from the membership.
export const DEMO_ROLE_LENSES = [
  {
    key: 'chair',
    personaKey: 'DR_HAMAD_MAJEEGHEER',
    orgPublicId: 'DEMO-ORG-QDB',
    committeePublicId: 'DEMO-COMM-QDB-DIGITAL',
    titleAr: 'من منظور رئيس اللجنة',
    titleEn: 'Through the Chair lens',
    summaryAr:
      'اعتماد جدول الأعمال، وإدارة سير البنود، والبت في القرارات، واعتماد المحاضر — داخل هذه اللجنة فقط.',
    summaryEn:
      'Approve the agenda, run agenda progression, decide on proposals and approve minutes — in this committee only.',
  },
  {
    key: 'secretary',
    personaKey: 'DR_HAMAD_MAJEEGHEER',
    orgPublicId: 'DEMO-ORG-QDB',
    committeePublicId: 'DEMO-COMM-QDB-INNOVATION',
    titleAr: 'من منظور أمين السر',
    titleEn: 'Through the Secretary lens',
    summaryAr:
      'تجهيز الأجندة والمحاضر وحزمة الاجتماع ومتابعة سجل الإجراءات، دون اعتماد القرار نيابة عن الرئيس.',
    summaryEn:
      'Prepare the agenda, minutes and meeting pack and follow up the action register — without approving in place of the Chair.',
  },
  {
    key: 'member',
    personaKey: 'DR_HAMAD_MAJEEGHEER',
    orgPublicId: 'DEMO-ORG-QDB',
    committeePublicId: 'DEMO-COMM-QDB-INVESTMENT',
    titleAr: 'من منظور العضو',
    titleEn: 'Through the Member lens',
    summaryAr:
      'المراجعة والتعليق والتوصية وتقديم الأدلة، دون صلاحية اعتماد القرارات أو قبول المخاطر.',
    summaryEn:
      'Review, comment, recommend and provide evidence — with no authority to approve decisions or accept risk.',
  },
];

/** Resolve a role lens by key. Unknown or missing → null (never another lens). */
export function resolveRoleLens(key) {
  if (!key || typeof key !== 'string') return null;
  const wanted = key.trim().toLowerCase();
  return DEMO_ROLE_LENSES.find((l) => l.key === wanted) || null;
}

/** Landing route for a lens — the committee where the persona actually holds the role. */
export function roleLensPath(lens) {
  if (!lens) return null;
  return `/o/${lens.orgPublicId}/c/${lens.committeePublicId}`;
}