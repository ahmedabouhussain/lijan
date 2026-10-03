// LIJAN™ — governed demo persona registry (frontend mirror).
// Mirrors base44/shared/demoPersonas.ts — keep both in sync if either changes.
//
// Every demonstration persona resolves through ONE identity path: a virtual user id
// (DEMO-USER-*) plus a demo dataset key. The server resolves memberships, roles and
// organizations from those two keys; the UI carries only the session.

export const DEMO_PERSONAS = {
  FAHAD_AL_FIHAIDI: {
    key: 'FAHAD_AL_FIHAIDI',
    user_id: 'DEMO-USER-FAHAD-AL-FIHAIDI',
    dataset: 'FAHAD_QATAR_GOVERNMENT_DEMO_V2',
    email: 'F.alfihaidi@lijan.com',
    name_ar: 'فهد الفهيدي',
    name_en: 'Fahad Al-Fihaidi',
    job_title_ar: 'مدير التدقيق',
    job_title_en: 'Director of Audit',
    primary_org_ar: 'مجلس التدقيق والمراجعة',
    primary_org_en: 'Audit and Review Council',
    primary_org_public_id: 'DEMO-ORG-AUDIT-COUNCIL',
  },
  DR_HAMAD_MAJEEGHEER: {
    key: 'DR_HAMAD_MAJEEGHEER',
    user_id: 'DEMO-USER-DR-HAMAD-MAJEEGHEER',
    dataset: 'DR_HAMAD_GOVERNED_DEMO_V1',
    email: 'dr.hamad.majeegheer.demo@lijan.example',
    name_ar: 'الدكتور حمد سالم مجيغير',
    name_en: 'Dr. Hamad Salem Majeegheer',
    job_title_ar: 'حساب تجريبي حوكمي تنفيذي',
    job_title_en: 'Governed Executive Demonstration Persona',
    primary_org_ar: 'بنك قطر للتنمية',
    primary_org_en: 'Qatar Development Bank',
    primary_org_public_id: 'DEMO-ORG-QDB',
  },
};

export const DEFAULT_DEMO_PERSONA_KEY = 'FAHAD_AL_FIHAIDI';

/** Resolve a persona by key. An unknown or missing key falls back to the platform demo persona. */
export function resolveDemoPersona(key) {
  return DEMO_PERSONAS[key] || DEMO_PERSONAS[DEFAULT_DEMO_PERSONA_KEY];
}