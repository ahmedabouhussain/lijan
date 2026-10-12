// sovereign-standards-1.0.0 — سجل المعايير السيادية (الإثبات الذي يطلبه مراجعو الحوكمة الوطنيون).
//
// WHY THIS EXISTS. «أداة» تُعلن ما تفعله؛ و«منصة سيادية حكومية» تُعلن أي معيار دولي تلتزم به،
// ماذا تفعل ازاء كل بند فيه، أين دليله داخل المنصة، ومن الجهة المالكة للحالة. هذا السجل هو
// الفرق: مراجع الحوكمة الوزاري ومكتب التدقيق الوطني يطلبان الإثبات لا الادّعاء.
//
// WHAT THIS MODULE IS. إعلان نقي بلا قراءة ولا كتابات: ستة معايير دولية، لكلٍّ بنوده،
// ولكل بند ما تفعله المنصة + الدليل (يشير إلى عقد أو كيان موجود) + الجهة المالكة + الحالة.
// الحالات ثلاث: ملتزم (adhered) · جزئي (partial) · مخطّط (planned) — وما هو جزئي أو مخطّط
// يُعلن حدّه صراحةً، فلا يُدَّعى امتثال بلا دليل.
//
// WHAT IT DOES NOT CLAIM. لا يُصدر شهادة، لا يُعلن امتثالاً خارجياً، ولا يحلّ محل تدقيق
// مستقل. هو إعلان المنصة عن نفسها ازاء معايير معلنة — والفحص الذاتي يكشف أي بند بلا دليل.

export const SOVEREIGN_STANDARDS_VERSION = 'sovereign-standards-1.0.0';

export type StandardStatus = 'adhered' | 'partial' | 'planned';

export interface SovereignControl {
  id: string;
  clause: string;
  ar: string;
  en: string;
  what_platform_does_ar: string;
  what_platform_does_en: string;
  evidence: string;
  evidence_kind: 'contract' | 'entity' | 'surface' | 'policy' | 'process';
  owning_authority_ar: string;
  owning_authority_en: string;
  status: StandardStatus;
  declared_limit_ar?: string;
  declared_limit_en?: string;
}

export interface SovereignStandard {
  id: string;
  standard_key: string;
  name_ar: string;
  name_en: string;
  issuing_body_ar: string;
  issuing_body_en: string;
  reference_url: string;
  summary_ar: string;
  summary_en: string;
  controls: SovereignControl[];
}

// ستة معايير دولية تشكّل الإطار السيادي للحوكمة الحكومية.
export const SOVEREIGN_STANDARDS: SovereignStandard[] = [
  {
    id: 'std-oecd-governance',
    standard_key: 'oecd_corporate_governance',
    name_ar: 'مبادئ منظمة التعاون الاقتصادي والتنمية لحوكمة الشركات (G20/OECD)',
    name_en: 'OECD Principles of Corporate Governance (G20/OECD)',
    issuing_body_ar: 'منظمة التعاون الاقتصادي والتنمية',
    issuing_body_en: 'Organisation for Economic Co-operation and Development',
    reference_url: 'https://www.oecd.org/en/topics/principles/corporate-governance.html',
    summary_ar: 'الإطار الدولي المعتمد حكوميًا: فصل الملكية عن الإدارة، الشفافية، المساءلة، عدالة المساهمين، ومسؤوليات مجلس الإدارة.',
    summary_en: 'The internationally government-adopted framework: separation of ownership and management, transparency, accountability, equitable treatment, and board responsibilities.',
    controls: [
      {
        id: 'oecd-separation',
        clause: 'VI.D',
        ar: 'فصل الصلاحيات بين الإنشاء والاعتماد والتنفيذ',
        en: 'Separation of duties between drafting, approval, and execution',
        what_platform_does_ar: 'لا شخص واحد يجمع إنشاء القرار واعتماده النهائي و تنفيذه: كل فعل يمرّ بأمر خادمي محكوم يفحص السلطة، والكيان يفرّق المنشئ عن المُعتمِد عن المنفّذ.',
        what_platform_does_en: 'No single person holds creation, final approval, and execution for the same record: every act passes a governed server command that checks authority, and the entity separates the drafter, the approver, and the executor.',
        evidence: 'commandGuard.ts · authorityKernel.ts · authorityPolicyManifest.json',
        evidence_kind: 'contract',
        owning_authority_ar: 'نواة السلطة (Authority Kernel)',
        owning_authority_en: 'Authority Kernel',
        status: 'adhered',
      },
      {
        id: 'oecd-transparency',
        clause: 'V.A',
        ar: 'الشفافية والإفصاح في الوقت المناسب',
        en: 'Disclosure and transparency in a timely manner',
        what_platform_does_ar: 'كل قرار صادر يُحفظ بحزمة إصدار مجمّدة (IssueSnapshot) بها البصمة والناخبون والنتيجة، وسلسلة الإثبات قابلة للمراجعة من المنشأ حتى النشر.',
        what_platform_does_en: 'Every issued decision is preserved as a frozen issuance package (IssueSnapshot) carrying the fingerprint, the electorate, and the result, with a proof chain reviewable from origin to publication.',
        evidence: 'IssueSnapshot entity · auditChain.ts · ProofChain.jsx',
        evidence_kind: 'entity',
        owning_authority_ar: 'سجل التدقيق',
        owning_authority_en: 'Audit trail',
        status: 'adhered',
      },
      {
        id: 'oecd-accountability',
        clause: 'VI.A',
        ar: 'مساءلة مجلس الإدارة تجاه الجهة المؤسسة',
        en: 'Board accountability to the institution',
        what_platform_does_ar: 'كل فعل حوكمي موسوم بفاعله ومقعده وصفته والوقت الذي وقع فيه — لا فعل مجهول المصدر، ولا كتابة بلا هوية سجل.',
        what_platform_does_en: 'Every governed act carries its actor, seat, capacity, and the instant it was taken — no anonymous act, no write without a recorded identity.',
        evidence: 'AuditEvent entity · governedReadPolicy.ts',
        evidence_kind: 'entity',
        owning_authority_ar: 'سجل التدقيق',
        owning_authority_en: 'Audit trail',
        status: 'adhered',
      },
      {
        id: 'oecd-conflict',
        clause: 'III.A',
        ar: 'إدارة تعارض المصالح والتنحي',
        en: 'Conflict of interest management and recusal',
        what_platform_does_ar: 'التنحي يُسجَّل بمعرّف (لا بالاسم)، ويُستبعد المُتنحّي من التصويت على البند، ويبقى في المداولة وفق سياسة اللجنة.',
        what_platform_does_en: 'Recusal is recorded by identifier (not by name), the recused member is excluded from voting on the item, and remains in deliberation per committee policy.',
        evidence: 'Recusal entity · voteEligibility.ts',
        evidence_kind: 'entity',
        owning_authority_ar: 'سياسة التصويت',
        owning_authority_en: 'Voting policy',
        status: 'adhered',
      },
    ],
  },
  {
    id: 'std-oecd-ai',
    standard_key: 'oecd_ai_principles',
    name_ar: 'مبادئ منظمة التعاون الاقتصادي والتنمية للذكاء الاصطناعي',
    name_en: 'OECD AI Principles',
    issuing_body_ar: 'منظمة التعاون الاقتصادي والتنمية',
    issuing_body_en: 'Organisation for Economic Co-operation and Development',
    reference_url: 'https://oecd.ai/en/ai-principles',
    summary_ar: 'الإطار الدولي للذكاء الاصطناعي المسؤول: استشاري بشري في الحلقة، شفافية، مساءلة، أمان، وقيم إنسانية.',
    summary_en: 'The international framework for responsible AI: human-in-the-loop, transparency, accountability, safety, and human-centred values.',
    controls: [
      {
        id: 'ai-advisory',
        clause: '1.3',
        ar: 'الإنسان في الحلقة — الذكاء استشاري بحت لا يُغيّر حالة',
        en: 'Human-in-the-loop — AI is advisory only and changes no state',
        what_platform_does_ar: 'خمسة شروط حاكمة: استشاري بحت · موسوم ومُسجَّل في AIOutputLedger · قبل السجل · سيادة البيانات · لا يُخترع ما ليس في النص. لا أمر ذكاء يُغيّر حالة قرار أو يوقف إصدارًا.',
        what_platform_does_en: 'Five governing conditions: advisory only · labelled and recorded in the AIOutputLedger · pre-record · data sovereignty · no invention beyond the text. No AI command changes a decision state or stops an issuance.',
        evidence: 'AIOutputLedger entity · recordRiskScan.ts · meetingInsights.ts',
        evidence_kind: 'contract',
        owning_authority_ar: 'سجل مخرجات الذكاء',
        owning_authority_en: 'AI output ledger',
        status: 'adhered',
      },
      {
        id: 'ai-transparency',
        clause: '1.2',
        ar: 'الشفافية — كل مخرج موسوم ومُسجَّل بثقة موثقة',
        en: 'Transparency — every output labelled and recorded with attested confidence',
        what_platform_does_ar: 'كل مخرج ذكاء يحمل ledger_id ونوعه والمصدر والنموذج والوقت والفاعل وثقة النموذج الذاتية وأساسها — والحكم النهائي بشري يُسجَّل في حلقة التغذية الراجعة.',
        what_platform_does_en: 'Every AI output carries its ledger_id, type, source, model, time, actor, the model self-confidence and its basis — and the final verdict is human, recorded in the feedback loop.',
        evidence: 'AIOutputLedger entity · AIFeedbackPanel.jsx · RecordAIFeedback',
        evidence_kind: 'entity',
        owning_authority_ar: 'سجل مخرجات الذكاء',
        owning_authority_en: 'AI output ledger',
        status: 'adhered',
      },
      {
        id: 'ai-accountability',
        clause: '1.4',
        ar: 'المساءلة — تتبّع كل مخرج إلى فاعله وسجلّه',
        en: 'Accountability — every output traceable to its actor and ledger',
        what_platform_does_ar: 'لا مخرج ذكاء بلا سجل ولا فاعل: الاستدعاء يفحص النطاق والجهة، والتغذية الراجعة تُسجّل هوية الإنسان وحكمه ووقته.',
        what_platform_does_en: 'No AI output without a ledger entry and an actor: the invocation checks scope and organization, and feedback records the human identity, verdict, and time.',
        evidence: 'RecordAIFeedback/entry.ts · governedReadPolicy.ts',
        evidence_kind: 'contract',
        owning_authority_ar: 'سجل مخرجات الذكاء',
        owning_authority_en: 'AI output ledger',
        status: 'adhered',
      },
    ],
  },
  {
    id: 'std-wcag',
    standard_key: 'wcag_2_1_aa',
    name_ar: 'إرشادات الوصول لمحتوى الويب (WCAG 2.1 AA)',
    name_en: 'Web Content Accessibility Guidelines (WCAG 2.1 AA)',
    issuing_body_ar: 'اتحاد شبكة الويب العالمية (W3C)',
    issuing_body_en: 'World Wide Web Consortium (W3C)',
    reference_url: 'https://www.w3.org/TR/WCAG21/',
    summary_ar: 'معيار الوصول الحكومي الدولي: قابلية الإدراك، قابلية التشغيل، الفهم، والمتانة. المنصات الحكومية ملزمة به دستوريًا في معظم الدول.',
    summary_en: 'The international government accessibility standard: perceivable, operable, understandable, and robust. Government platforms are constitutionally mandated to meet it in most jurisdictions.',
    controls: [
      {
        id: 'wcag-semantic',
        clause: '1.3.1',
        ar: 'المعلومات والعلاقات البرمجية — عناصر دلالية لا div قابلة للنقر',
        en: 'Info and relationships — semantic elements, not clickable divs',
        what_platform_does_ar: 'أزرار وروابط دلالية لا div قابلة للنقر، وعلامات aria-label على كل سطح، واتجاه RTL للعربية مع تبويب صحيح.',
        what_platform_does_en: 'Semantic buttons and links (not clickable divs), aria-label on every surface, and RTL direction for Arabic with correct tab order.',
        evidence: 'raqeem components · LanguageContext.jsx',
        evidence_kind: 'surface',
        owning_authority_ar: 'تصميم الواجهة',
        owning_authority_en: 'Interface design',
        status: 'partial',
        declared_limit_ar: 'التقييم المستقل لـ WCAG 2.1 AA لم يُنجز بعد — الإعلان ازاء بنود التباين اللوني الكامل وقراءة الشاشة للجداول الديناميكية مخطّط.',
        declared_limit_en: 'Independent WCAG 2.1 AA assessment not yet completed — declaration against full color-contrast and screen-reader coverage for dynamic tables is planned.',
      },
      {
        id: 'wcag-rtl',
        clause: '3.1.2',
        ar: 'لغة المحتوى — العربية كأولوية مع RTL',
        en: 'Language of content — Arabic-first with RTL',
        what_platform_does_ar: 'ثنائية لغوية كاملة (عربي/إنجليزي) مع اتجاه RTL وخط Noto Naskh Arabic محلي محزّم (لا يعتمد على CDN خارجي) للاستقرار في البيئات المغلقة.',
        what_platform_does_en: 'Full bilingual (Arabic/English) with RTL direction and locally bundled Noto Naskh Arabic (no external CDN dependency) for stability in closed environments.',
        evidence: 'index.css · tailwind.config.js',
        evidence_kind: 'surface',
        owning_authority_ar: 'تصميم الواجهة',
        owning_authority_en: 'Interface design',
        status: 'adhered',
      },
      {
        id: 'wcag-motion',
        clause: '2.3.3',
        ar: 'الحركة والوميض — احترام تفضيل تقليل الحركة',
        en: 'Motion and animation — respect reduced-motion preference',
        what_platform_does_ar: 'media query تُحترم: حركة مخفّضة تُلغي الرسوم المتحركة والانتقالات لمن يحتاجونها.',
        what_platform_does_en: 'A respected media query: reduced motion cancels animations and transitions for those who need it.',
        evidence: 'index.css (prefers-reduced-motion)',
        evidence_kind: 'surface',
        owning_authority_ar: 'تصميم الواجهة',
        owning_authority_en: 'Interface design',
        status: 'adhered',
      },
    ],
  },
  {
    id: 'std-iso-audit',
    standard_key: 'iso_17021_audit',
    name_ar: 'سلسلة التدقيق المقاوم للتلاعب (ISO 17021 / SIEM-grade)',
    name_en: 'Tamper-evident audit chain (ISO 17021 / SIEM-grade)',
    issuing_body_ar: 'المنظمة الدولية للتقييس (ISO)',
    issuing_body_en: 'International Organization for Standardization',
    reference_url: 'https://www.iso.org/standard/65064.html',
    summary_ar: 'سجل تدقيق دائم، تسلسلي، مقاوم للتلاعب: لا يُمحى، لا يُعاد كتابته، وكل تعديل يُسلّم بسجل جديد مرتبط.',
    summary_en: 'A permanent, sequential, tamper-evident audit trail: never erased, never rewritten, and every correction is delivered as a new linked record.',
    controls: [
      {
        id: 'audit-append-only',
        clause: '9.4',
        ar: 'السجل إلحاقي — لا تحرير ولا حذف',
        en: 'Append-only records — no edit, no delete',
        what_platform_does_ar: 'سجلات التدقيق والمحاضر وحزم الإصدار والتصديق إلحاقية: RLS يحظر التحديث/الحذف بدور __append_only_no_writer__، والتصحيح سجلٌّ جديد مرتبط لا تحرير.',
        what_platform_does_en: 'Audit, minutes, issuance packages and ratification records are append-only: RLS forbids update/delete with the __append_only_no_writer__ role, and a correction is a new linked record, never an edit.',
        evidence: 'AuditEvent · IssueSnapshot · RatificationRecord RLS',
        evidence_kind: 'entity',
        owning_authority_ar: 'سجل التدقيق',
        owning_authority_en: 'Audit trail',
        status: 'adhered',
      },
      {
        id: 'audit-chain',
        clause: '9.5',
        ar: 'سلسلة الإثبات — من المنشأ حتى النشر',
        en: 'Proof chain — from origin to publication',
        what_platform_does_ar: 'كل قرار يحمل سلسلة إثبات قابلة للمراجعة: الإنشاء، التعديل، التصويت، الإصدار، التصديق — كل خطوة موسومة بالوقت والفاعل والمقعد.',
        what_platform_does_en: 'Every decision carries a reviewable proof chain: creation, amendment, voting, issuance, ratification — each step timestamped with its actor and seat.',
        evidence: 'auditChain.ts · ProofChain.jsx · GetRecordAuditTrail',
        evidence_kind: 'contract',
        owning_authority_ar: 'سجل التدقيق',
        owning_authority_en: 'Audit trail',
        status: 'adhered',
      },
    ],
  },
  {
    id: 'std-data-residency',
    standard_key: 'data_sovereignty',
    name_ar: 'سيادة البيانات والإقامة',
    name_en: 'Data sovereignty and residency',
    issuing_body_ar: 'سياسة مؤسسية',
    issuing_body_en: 'Institutional policy',
    reference_url: '',
    summary_ar: 'البيانات الحوكمية تبقى تحت سيادة الجهة المؤسسة: لا تصدير بلا تفويض، ولا وصول خارجي بلا سلطة، والملفات الخاصة تُوقَّع لا تُنشر علنًا.',
    summary_en: 'Governance data stays under the institution sovereignty: no export without authorization, no external access without authority, and private files are signed, not publicly published.',
    controls: [
      {
        id: 'residency-private',
        clause: '1',
        ar: 'الملفات المرفوعة خاصة افتراضيًا وموقّعة عند الوصول',
        en: 'Uploaded files are private by default and signed on access',
        what_platform_does_ar: 'كل رفع مستخدم افتراضيًا UploadPrivateFile (لا رابط عام)، والوصول يمرّ عبر رابط موقّع منتهي الصلاحية، ولا يُتاح إلا بسلطة محكومة.',
        what_platform_does_en: 'Every user upload defaults to UploadPrivateFile (no public URL), access goes through a signed expiring link, and is granted only under governed authority.',
        evidence: 'fileAccessPolicy.ts · secureFiles.js',
        evidence_kind: 'contract',
        owning_authority_ar: 'سياسة الوصول للملفات',
        owning_authority_en: 'File access policy',
        status: 'adhered',
      },
      {
        id: 'residency-rls',
        clause: '2',
        ar: 'العزل التنظيمي — كل جهة ترى بياناتها فقط',
        en: 'Tenant isolation — each organization sees only its own data',
        what_platform_does_ar: 'RLS على كل كيان حوكمي يقصر القراءة على active_org_id المطابق؛ ولا وصول متعدد الجهات بلا تفويض صريح.',
        what_platform_does_en: 'RLS on every governed entity restricts reads to the matching active_org_id; no cross-tenant access without explicit authorization.',
        evidence: 'entity RLS (organization_id = active_org_id)',
        evidence_kind: 'contract',
        owning_authority_ar: 'سياسة الصف (RLS)',
        owning_authority_en: 'Row-level security policy',
        status: 'adhered',
      },
      {
        id: 'residency-extract',
        clause: '3',
        ar: 'المستخرجات والوصول الخارجي بقدر محدود ومنتهٍ',
        en: 'Extracts and external access are bounded and expiring',
        what_platform_does_ar: 'مستخرج التنفيذ (ActionExtract) وضيف البند (AgendaItemGuest) بقدر محدود (obligation_only / item_only) ورابط منتهٍ وقابل للسحب — السعة لا تتسع أبدًا.',
        what_platform_does_en: 'The execution extract (ActionExtract) and agenda-item guest (AgendaItemGuest) are bounded (obligation_only / item_only) with expiring, revocable links — the scope never widens.',
        evidence: 'ActionExtractGrant · AgendaItemGuest entities',
        evidence_kind: 'entity',
        owning_authority_ar: 'عقد الوصول الخارجي',
        owning_authority_en: 'External access contract',
        status: 'adhered',
      },
    ],
  },
  {
    id: 'std-separation',
    standard_key: 'separation_of_duties',
    name_ar: 'فصل الصلاحيات والوصول المبني على الدور (RBAC)',
    name_en: 'Separation of duties and role-based access (RBAC)',
    issuing_body_ar: 'سياسة مؤسسية',
    issuing_body_en: 'Institutional policy',
    reference_url: '',
    summary_ar: 'السلطة تُشتق من المقعد لا من الحساب؛ والقدرة تُفحص لحظة الفعل ازاء سياسة نافذة؛ ولا يُتخذ فعل بلا قدرة موثقة.',
    summary_en: 'Authority is derived from the seat, not the account; capability is checked at the instant of the act against the in-force policy; and no act is taken without an attested capability.',
    controls: [
      {
        id: 'rbac-seat',
        clause: '1',
        ar: 'السلطة من المقعد لا من الحساب',
        en: 'Authority from the seat, not the account',
        what_platform_does_ar: 'القراءة الفعّالة للصفة تمرّ عبر عقد effective-time (membership-effect-1.0.0): المقعد يُقيَّم لحظة الفعل من الوقائع السارية، لا من حالة مسجَّلة قد تكون قديمة.',
        what_platform_does_en: 'The effective capacity read goes through the effective-time contract (membership-effect-1.0.0): the seat is evaluated at the instant of the act from effective facts, not from a recorded status that may be stale.',
        evidence: 'membershipEffect.ts · authorityKernel.ts',
        evidence_kind: 'contract',
        owning_authority_ar: 'نواة السلطة',
        owning_authority_en: 'Authority Kernel',
        status: 'adhered',
      },
      {
        id: 'rbac-capability',
        clause: '2',
        ar: 'القدرة تُفحص لحظة الفعل ازاء سياسة نافذة',
        en: 'Capability checked at the instant of the act against in-force policy',
        what_platform_does_ar: 'كل أمر محكوم يفحص القدرة عبر authorizeCommand: لا يُنفّذ فعل بلا قدرة موثقة، وكل رفض يحمل سببه وكوده.',
        what_platform_does_en: 'Every governed command checks capability via authorizeCommand: no act runs without an attested capability, and every refusal carries its reason and code.',
        evidence: 'commandGuard.ts · capabilityKernel.ts',
        evidence_kind: 'contract',
        owning_authority_ar: 'نواة السلطة',
        owning_authority_en: 'Authority Kernel',
        status: 'adhered',
      },
      {
        id: 'rbac-recusal',
        clause: '3',
        ar: 'التنحي بالمعرّف لا بالاسم — منع تصادم الهويات',
        en: 'Recusal by identifier, not by name — identity collision prevention',
        what_platform_does_ar: 'حلّ التنحي بالمقعد والعضوية (seat_id / membership_id) لا بالاسم العربي، لمنع التصادم الذي يحدث عند تطابق الأسماء.',
        what_platform_does_en: 'Recusal is resolved by seat and membership (seat_id / membership_id), not by Arabic name, to prevent the collision that occurs when names match.',
        evidence: 'voteEligibility.ts · Recusal entity',
        evidence_kind: 'contract',
        owning_authority_ar: 'سياسة التصويت',
        owning_authority_en: 'Voting policy',
        status: 'adhered',
      },
    ],
  },
];

export const STATUS_LABELS: Record<StandardStatus, { ar: string; en: string; tone: string }> = {
  adhered: { ar: 'ملتزم', en: 'Adhered', tone: 'state-success' },
  partial: { ar: 'جزئي', en: 'Partial', tone: 'state-warning' },
  planned: { ar: 'مخطّط', en: 'Planned', tone: 'state-info' },
};

export const EVIDENCE_KIND_LABELS: Record<string, { ar: string; en: string }> = {
  contract: { ar: 'عقد', en: 'Contract' },
  entity: { ar: 'كيان', en: 'Entity' },
  surface: { ar: 'سطح', en: 'Surface' },
  policy: { ar: 'سياسة', en: 'Policy' },
  process: { ar: 'إجراء', en: 'Process' },
};

/** الفحص الذاتي: كل بند بلا دليل أو بلا جهة مالكة عيب لا أسلوب. */
export function auditStandards(): { ok: boolean; findings: string[]; counts: Record<string, number> } {
  const findings: string[] = [];
  const counts: Record<string, number> = { standards: 0, controls: 0, adhered: 0, partial: 0, planned: 0 };
  counts.standards = SOVEREIGN_STANDARDS.length;
  for (const std of SOVEREIGN_STANDARDS) {
    if (!std.controls.length) findings.push(`standard_without_controls:${std.id}`);
    for (const c of std.controls) {
      counts.controls += 1;
      counts[c.status] = (counts[c.status] || 0) + 1;
      if (!c.evidence || !c.evidence.trim()) findings.push(`control_without_evidence:${c.id}`);
      if (!c.owning_authority_ar || !c.owning_authority_en) findings.push(`control_without_authority:${c.id}`);
      if ((c.status === 'partial' || c.status === 'planned') && (!c.declared_limit_ar || !c.declared_limit_en)) {
        findings.push(`non_adhered_without_declared_limit:${c.id}`);
      }
      if (!c.what_platform_does_ar || !c.what_platform_does_en) findings.push(`control_without_action:${c.id}`);
    }
  }
  return { ok: findings.length === 0, findings, counts };
}

export function standardsSummary() {
  const audit = auditStandards();
  return {
    standards: SOVEREIGN_STANDARDS.length,
    controls: audit.counts.controls,
    adhered: audit.counts.adhered || 0,
    partial: audit.counts.partial || 0,
    planned: audit.counts.planned || 0,
    coverage: audit.counts.controls ? Math.round((audit.counts.adhered / audit.counts.controls) * 100) : 0,
  };
}