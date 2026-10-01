// LIJAN™ — «أمين» / AMEEN
// Single source of truth for the ONE institutional assistant:
// identity, contextual states, and role-adaptive profiles.
//
// NOTE: context keys here are mirrored by base44/shared/ameenContextKernel.ts.
// The server owns permissions/sources; this file owns labels and prompts.

export const AMEEN_AGENT_NAME = "ameen";

export const AMEEN_IDENTITY = {
  name: { ar: "أمين", en: "AMEEN" },
  title: { ar: "المساعد المؤسسي للجان", en: "Institutional Committee Intelligence" },
};

/**
 * Contextual states of «أمين». One assistant — many states.
 * Each state defines the active scope label, its data-scope note, and
 * grounded quick prompts.
 */
export const AMEEN_CONTEXTS = {
  general: {
    key: "general",
    label: { ar: "السياق المؤسسي العام", en: "General institutional context" },
    scopeNote: {
      ar: "يستخدم أمين معلومات الجهات واللجان المصرّح لك بالوصول إليها فقط.",
      en: "Ameen only uses organizations and committees you are authorized to access.",
    },
    prompts: [
      { ar: "ما الأعمال ذات الأولوية لديّ؟", en: "What needs my attention?" },
      { ar: "ما اجتماعات اليوم؟", en: "What meetings are today?" },
      { ar: "ما القرارات المتأخرة؟", en: "What decisions are overdue?" },
    ],
  },
  committee: {
    key: "committee",
    label: { ar: "سياق اللجنة", en: "Committee context" },
    scopeNote: {
      ar: "يستخدم أمين معلومات هذه اللجنة والسجلات المصرّح لك بالوصول إليها فقط.",
      en: "Ameen only uses this committee's information and records you are authorized to see.",
    },
    prompts: [
      { ar: "أعدّ موجزاً عن اللجنة.", en: "Prepare a committee brief." },
      { ar: "ما البنود المتأخرة؟", en: "Which items are overdue?" },
      { ar: "ما القرارات المفتوحة؟", en: "What decisions are open?" },
      { ar: "ما الموضوعات التي تحتاج قراراً؟", en: "What needs a decision?" },
    ],
  },
  meeting: {
    key: "meeting",
    label: { ar: "سياق الاجتماع", en: "Meeting context" },
    scopeNote: {
      ar: "يستخدم أمين بيانات هذا الاجتماع وجدول أعماله والسجلات المرتبطة به.",
      en: "Ameen uses this meeting's data, agenda, and related records.",
    },
    prompts: [
      { ar: "اعرض بنود جدول الأعمال.", en: "Show the agenda items." },
      { ar: "ما حالة النصاب؟", en: "What is the quorum status?" },
      { ar: "ما البنود غير المحسومة؟", en: "Which items are unresolved?" },
      { ar: "أعدّ ملخص نهاية الاجتماع.", en: "Draft the closing summary." },
    ],
  },
  minutes: {
    key: "minutes",
    label: { ar: "سياق المحضر", en: "Minutes context" },
    scopeNote: {
      ar: "يستخدم أمين مسودة المحضر والملاحظات والوثائق المرتبطة بالجلسة.",
      en: "Ameen uses the draft minutes, notes, and documents tied to the session.",
    },
    prompts: [
      { ar: "أعدّ مسودة المحضر.", en: "Draft the minutes." },
      { ar: "افصل النقاش عن القرار والإجراء.", en: "Separate discussion, decisions, and actions." },
      { ar: "ما المعلومات الناقصة؟", en: "What information is missing?" },
    ],
  },
  decision: {
    key: "decision",
    label: { ar: "سياق القرارات والمتابعة", en: "Decisions & follow-up context" },
    scopeNote: {
      ar: "يستخدم أمين القرارات المرتبطة بهذه اللجنة وسجل المتابعة الخاص بها.",
      en: "Ameen uses this committee's decisions and its follow-up register.",
    },
    prompts: [
      { ar: "اعرض القرارات المفتوحة.", en: "Show open decisions." },
      { ar: "ما القرارات المتأخرة عن موعدها؟", en: "Which decisions passed their target date?" },
      { ar: "أعدّ موجز تنفيذ قرار.", en: "Prepare a decision execution brief." },
    ],
  },
  actions: {
    key: "actions",
    label: { ar: "سياق الإجراءات والتنفيذ", en: "Actions & execution context" },
    scopeNote: {
      ar: "يستخدم أمين الإجراءات المسندة داخل نطاقك وصلاحيتك.",
      en: "Ameen uses the actions assigned within your authorized scope.",
    },
    prompts: [
      { ar: "اعرض إجراءاتي المعلقة.", en: "Show my open actions." },
      { ar: "ما الإجراءات المتأخرة؟", en: "Which actions are overdue?" },
      { ar: "ما الإجراءات التي تتطلب تصعيداً؟", en: "Which actions need escalation?" },
    ],
  },
  documents: {
    key: "documents",
    label: { ar: "سياق الوثائق والسجلات", en: "Documents & records context" },
    scopeNote: {
      ar: "يستخدم أمين الوثائق المصرّح لك بالوصول إليها داخل هذا النطاق فقط.",
      en: "Ameen only uses documents you are authorized to access in this scope.",
    },
    prompts: [
      { ar: "لخّص هذه الوثيقة.", en: "Summarize this document." },
      { ar: "استخرج الالتزامات والمواعيد.", en: "Extract commitments and dates." },
      { ar: "قارن الإصدارات.", en: "Compare versions." },
    ],
  },
  governance: {
    key: "governance",
    label: { ar: "سياق الحوكمة والامتثال", en: "Governance & compliance context" },
    scopeNote: {
      ar: "يستخدم أمين قواعد اللجنة وسجلات الالتزام المتاحة لصلاحيتك.",
      en: "Ameen uses the committee's rules and the compliance records your role permits.",
    },
    prompts: [
      { ar: "افحص اكتمال التشكيل والمدة.", en: "Check composition and term completeness." },
      { ar: "ما تضارب المصالح المسجّل؟", en: "What conflicts of interest are recorded?" },
      { ar: "ما الأدلة الناقصة؟", en: "What evidence is missing?" },
    ],
  },
  memory: {
    key: "memory",
    label: { ar: "سياق الذاكرة المؤسسية", en: "Institutional memory context" },
    scopeNote: {
      ar: "يبحث أمين في السوابق والسجلات التاريخية ضمن النطاق المصرّح لك به.",
      en: "Ameen searches precedents and historical records within your authorized scope.",
    },
    prompts: [
      { ar: "ما السوابق في هذا الموضوع؟", en: "What precedents exist on this topic?" },
      { ar: "اعرض تاريخ الموضوع.", en: "Show this topic's history." },
      { ar: "حلّل أنماط التأخير.", en: "Analyse delay patterns." },
    ],
  },
};

/** Role-adaptive focus — the same أمين, different emphasis per committee role. */
export const AMEEN_ROLE_PROFILES = {
  chair: {
    key: "chair",
    label: { ar: "رئيس اللجنة", en: "Committee Chair" },
    focus: {
      ar: "ركّز على الجاهزية، النصاب، القرارات المطلوبة، الموضوعات الحرجة، وتوجيه الاجتماع.",
      en: "Focus on readiness, quorum, required decisions, critical items, and steering the meeting.",
    },
  },
  vice_chair: {
    key: "vice_chair",
    label: { ar: "نائب الرئيس", en: "Vice Chair" },
    focus: {
      ar: "ركّز على دعم الرئيس، البنود المفوّضة، المتابعة، والجاهزية لتولي مهام الرئيس عند التفويض.",
      en: "Focus on supporting the chair, delegated items, follow-up, and readiness to stand in when delegated.",
    },
  },
  secretary: {
    key: "secretary",
    label: { ar: "أمين السر", en: "Secretary" },
    focus: {
      ar: "ركّز على جدول الأعمال، الدعوات، الوثائق، الحضور، المحاضر، القرارات، التوزيع، والأرشفة.",
      en: "Focus on the agenda, invitations, documents, attendance, minutes, decisions, distribution, and archiving.",
    },
  },
  committee_administrator: {
    key: "committee_administrator",
    label: { ar: "مسؤول اللجنة", en: "Committee Administrator" },
    focus: {
      ar: "ركّز على إدارة السجلات والتشكيل والاجتماعات والوثائق ضمن الصلاحية.",
      en: "Focus on managing records, composition, meetings, and documents within your authority.",
    },
  },
  member: {
    key: "member",
    label: { ar: "عضو", en: "Member" },
    focus: {
      ar: "ركّز على أوراق الاجتماع، البنود المطلوب مراجعتها، إبداء الرأي، التصويت، والمهام المسندة إليك.",
      en: "Focus on meeting papers, items for your review, your input, voting, and your assigned actions.",
    },
  },
  alternate: {
    key: "alternate",
    label: { ar: "عضو بديل", en: "Alternate Member" },
    focus: {
      ar: "ركّز على البنود التي قد تُنشّط فيها البدالة وحدود صلاحيتك الحالية.",
      en: "Focus on the items where your alternation may activate and the limits of your current authority.",
    },
  },
  observer: {
    key: "observer",
    label: { ar: "مراقب", en: "Observer" },
    focus: {
      ar: "اقتصر على ما تسمح به الدعوة ونطاق مشاركتك، دون بيانات مقيدة.",
      en: "Stay within what the invitation and your participation scope allow; no restricted records.",
    },
  },
  advisor: {
    key: "advisor",
    label: { ar: "مستشار", en: "Advisor" },
    focus: {
      ar: "ركّز على التحليل والسياق والمقارنة، دون صلاحية قرار أو تصويت.",
      en: "Focus on analysis, context, and comparison — no decision or voting authority.",
    },
  },
  org_admin: {
    key: "org_admin",
    label: { ar: "مسؤول الجهة", en: "Organization Administrator" },
    focus: {
      ar: "ركّز على الإدارة التنظيمية للجهة. لا تمنح أمين سلطة تشغيلية داخل اللجان نيابةً عنك.",
      en: "Focus on organizational administration. Do not grant operational committee authority.",
    },
  },
  platform_admin: {
    key: "platform_admin",
    label: { ar: "مسؤول المنصة", en: "Platform Administrator" },
    focus: {
      ar: "ركّز على الإدارة الفنية. لا تمنح الصلاحية الإدارية للمنصة سلطة تشغيلية داخل اللجان.",
      en: "Focus on technical administration. Platform administration grants no committee authority.",
    },
  },
  none: {
    key: "none",
    label: { ar: "زائر مصرّح", en: "Authorized visitor" },
    focus: {
      ar: "اقتصر على المعلومات العامة المتاحة لك، ولا تفترض صلاحيات غير ممنوحة.",
      en: "Stay within what is publicly available to you; never assume ungranted permissions.",
    },
  },
};

export function getAmeenContext(key) {
  return AMEEN_CONTEXTS[key] || AMEEN_CONTEXTS.general;
}

export function getAmeenRoleProfile(role) {
  return AMEEN_ROLE_PROFILES[role] || AMEEN_ROLE_PROFILES.none;
}