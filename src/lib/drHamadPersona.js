// Frontend-only display constants for the Dr. Hamad governed demonstration persona.
// Mirrors base44/shared/drHamadDataset.ts — keep names/labels in sync if either changes.
export const DR_HAMAD_PERSONA = {
  name_ar: "الدكتور حمد سالم مجيغير",
  name_en: "Dr. Hamad Salem Majeegheer",
  primary_org_ar: "بنك قطر للتنمية",
  primary_org_en: "Qatar Development Bank",
};

export const ROLE_LABELS = {
  chair: { ar: "رئيس اللجنة", en: "Chair" },
  vice_chair: { ar: "نائب رئيس اللجنة", en: "Vice-Chair" },
  member: { ar: "عضو اللجنة", en: "Member" },
  secretary: { ar: "أمين سر اللجنة", en: "Committee Secretary" },
};

export const COMMITTEE_FILTERS = [
  { key: "all", ar: "الكل", en: "All" },
  { key: "chair", ar: "رئيس", en: "Chair" },
  { key: "vice_chair", ar: "نائب الرئيس", en: "Vice-Chair" },
  { key: "member", ar: "عضو", en: "Member" },
  { key: "secretary", ar: "أمين سر", en: "Secretary" },
  { key: "qdb", ar: "لجان بنك قطر للتنمية", en: "QDB Committees" },
  { key: "national", ar: "لجان وطنية", en: "National Committees" },
  { key: "external", ar: "لجان خارجية", en: "External Committees" },
  { key: "needs_action", ar: "يتطلب إجراءً مني", en: "Needs My Action" },
];