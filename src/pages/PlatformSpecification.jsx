import React, { useState, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Printer, ChevronDown, ChevronRight, Languages } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import BrandLogo from "@/components/raqeem/BrandLogo";
import LanguageSwitcher from "@/components/raqeem/LanguageSwitcher";
import PoweredByConnection from "@/components/brand/PoweredByConnection";

// PlatformSpecification — وثيقة المواصفات الفنية الشاملة (تسليم لشركة تطوير).
// مستندان منفصلان تمامًا: النسخة العربية الكاملة (RTL) ثم النسخة الإنجليزية الكاملة (LTR).

/* سياق لغة المستند — كل نسخة تُعرض بلغة واحدة فقط */
const LangCtx = createContext("ar");
const useT = () => { const l = useContext(LangCtx); return (ar, en) => (l === "ar" ? ar : en); };

const FUNCTION_GROUPS = [
  { ar: "المؤسسات والبوابات المؤسسية", en: "Institutions & Institutional Portals",
    fns: ["CreateCommittee","EnterOrganizationPortal","GetOrganizationPortal","JoinOrganization","RequestOrganizationAccess","ResolveOrganizationIdentity","MergeDuplicateOrganizations","SetOrganizationStatus","AdministerOrganizationMembership","ProvisionOrganizationPortal","CheckExistingPortal","GetMyOrganizations"] },
  { ar: "التأسيس والتشكيل ووثائق التأسيس", en: "Formation & Founding Instruments",
    fns: ["UploadFoundingInstrument","ExtractInstrumentData","ExtractCommitteeCharter","CreateCommitteeDraftFromInstrument","CreateCommittee","UpdateCommitteeFormation","ProposeCommitteeAmendment","ApproveCommitteeAmendment","ApplyScheduledAmendments","TransitionAmendmentStatus","AcknowledgeCommitteeChange"] },
  { ar: "السجل الرسمي والتحرير المحكوم", en: "Official Record & Governed Editing",
    fns: ["CreateCommitteeRecord","SubmitCommitteeRecord","PublishCommitteeRecord","SupersedeOfficialRecord","ArchivePermittedRecord","ReturnCommitteeRecordForCorrection","UpdateCommitteeDraftRecord","RestorePageConfigurationVersion","PublishPageConfiguration","SavePageConfigurationDraft","GetEffectivePageConfiguration","ResetPageConfigurationToOrganization"] },
  { ar: "التنشيط والاستعداد للجلوس", en: "Activation & Seated Readiness",
    fns: ["ActivateCommittee","TransitionCommitteeStatus","GetSeatedActorReadiness","SuspendCommittee","RenewCommittee","CloseCommittee"] },
  { ar: "العضوية والمقاعد والتعيين", en: "Membership, Seats & Appointments",
    fns: ["InviteCommitteeMember","RespondToInvitation","EndCommitteeMembership","RecordAppointmentEvent","ActivateAlternate","ExtendTerm","DelegateAuthority","InitiateHandover","AcceptHandover","SetPrincipalBasis","GetPrincipalBasis","DeclareConflict","RecordRecusal","NotifyAffectedMembers"] },
  { ar: "الاجتماعات وجدول الأعمال", en: "Meetings & Agenda",
    fns: ["CreateMeeting","GenerateMeetingInstances","StartMeeting","AdjournMeeting","CancelMeeting","SubmitAgendaItem","EvaluateAgendaReadiness","ArchiveAgendaItem","TransitionAgendaItem","CertifyAttendance","InviteAgendaItemGuest","PreviewGuestAccess"] },
  { ar: "حزم الاجتماع والمحاضر", en: "Meeting Packs & Minutes",
    fns: ["GenerateMeetingPackDraft","SummarizeMeetingPack","PrepareMeetingInsights","PublishMeetingPack","PrepareMinutes","GenerateMeetingMinutes","TransitionMinutes","ApproveMinutes","SignRecord"] },
  { ar: "القرارات والتصويت", en: "Decisions & Voting",
    fns: ["CreateDecisionDraft","OpenVote","CastVote","CloseVote","IssueDecision","TransitionDecision","GetDecisionDossier","GetDecisionEffectState","CheckRecordConsistency","GetProposalChanges","ScanRecordRisks"] },
  { ar: "التداول بالكتابة والمصادقة", en: "Written Circulation & Ratification",
    fns: ["OpenCirculation","RecordCirculationResponse","FinalizeCirculation","GetCirculationState","SetCirculationPolicy","SetRatificationRoute","RecordRatification","GetRatificationState"] },
  { ar: "الاحتفاظ والتصرف في السجلات", en: "Retention & Record Disposition",
    fns: ["SetRetentionRule","GetRetentionState","RecordChangeDisposition","CompileChangeInventory"] },
  { ar: "التنفيذ والمتابعة والأدلة", en: "Execution, Follow-up & Evidence",
    fns: ["SubmitActionEvidence","ReviewActionEvidence","UpdateActionProgress","CloseAction","RequestActionExtension","ReviewActionExtension","ProcessEscalation","RetryEscalationNotice","RunExecutionReminders","RunAmeenExecutionFollowUp","RequestReview","RespondToReview"] },
  { ar: "مستخلصات التنفيذ والوصول المحدود", en: "Execution Extracts & Scoped Access",
    fns: ["ShareActionExtract","ListActionExtracts","GetActionExtractView","RespondToActionExtract","AnswerActionClarification","GetGuestItemView","RequestFileAccess","LogFileAccess"] },
  { ar: "الحوكمة والسيادة والمشاركة", en: "Governance, Sovereignty & Participation",
    fns: ["GetSovereignStandards","TestSovereignStandards","GetGovernanceSurfaces","TestGovernanceSurfaces","GetExceptionCatalogue","TestExceptionCatalogue","GetParticipationMatrix","TestParticipationMatrix","GetCommitteeCapabilities","AuthorizeCommitteeAction","GetCommitteeRecord","GetRecordAuditTrail","GetCommitteeMetrics","GetCommitteeMiniPortal","ListCommitteeRegister","TestGovernedSurfaces"] },
  { ar: "الذكاء الاصطناعي المحكوم والمساءلة", en: "Governed AI & Accountability",
    fns: ["RegisterAISystem","GetAISystems","GetAIAccountabilityReport","RecordAIFeedback","RecordAIIncident","GetPublicAIRegister","GenerateCommitteeGovernance","GenerateInstitutionalMemory","GeneratePolicyScenarioAI","CompileCommitteeMemory","ReviewMemoryRecord"] },
  { ar: "التكاملات والمزامنة", en: "Integrations & Synchronization",
    fns: ["GetCalendarConnection","SyncMeetingToCalendar","GetOutlookCalendarConnection","SyncMeetingToOutlook","GetIntegrationHealth","ResolveAmeenContext","GetAmeenSandboxData","LogAmeenAction"] },
  { ar: "الإشعارات والتوثيق", en: "Notifications & Documentation",
    fns: ["DispatchNotification","NotifyAffectedMembers","PublishDocumentationRelease","LogDocumentationDownload"] },
  { ar: "الأصول المؤسسية والمنتجات", en: "Institutional Assets & Products",
    fns: ["ImportOrganizationAsset","ImportOrganizationAssetPack","VerifyProductInstance","GenerateProduct"] },
  { ar: "التحقق والتسجيل", en: "Verification & Registration",
    fns: ["CheckUserRegistration","VerifyProductInstance"] },
  { ar: "عقود الاختبار الذاتي", en: "Self-test Contracts",
    fns: ["TestAmeenRetrievalGuard","TestAnnotationContinuity","TestAuditChain","TestAuthorizationGuard","TestCirculationApproval","TestContinuityContract","TestDecisionIntegrity","TestDecisionLifecycle","TestEvidenceAcceptance","TestEvidenceDossier","TestExceptionCatalogue","TestExecutionExtract","TestFileAccessPolicy","TestGovernanceSurfaces","TestGovernedSurfaces","TestGuestAccess","TestInstitutionalChange","TestMaterialChange","TestMeetingInsights","TestMeetingLifecycle","TestMembershipEffect","TestMetricDefinitions","TestPackDraft","TestParticipationMatrix","TestPrincipalRepresentation","TestProposalContent","TestRatificationRoute","TestRecordConsistency","TestRecordRiskScan","TestRetentionSchedule","TestSeatedReadiness","TestShowcaseIsolation","TestSovereignStandards","TestVoteEligibility","TestWorkReach"] },
  { ar: "بيانات العرض التجريبي والاستكشاف", en: "Demo Data & Exploration",
    fns: ["ProvisionDrHamadDemoData","RepairDrHamadDemoExperienceV3","GetDrHamadExperience","ProvisionFahadDemoData","SeedNSDCShowcase","IssueShowcaseSession","RevokeShowcaseSession","EnterExploration"] },
];
const TOTAL_FNS = FUNCTION_GROUPS.reduce((n, g) => n + g.fns.length, 0);

const STANDARDS = [
  { ar: "ISO/IEC 42001:2023 — نظام إدارة الذكاء الاصطناعي", en: "ISO/IEC 42001:2023 — AI Management System", scope: "§6.1.2 risk assessment · §8.3 impact assessment" },
  { ar: "قانون الاتحاد الأوروبي للذكاء الاصطناعي", en: "EU AI Act", scope: "Art. 6 risk classification · Art. 50 transparency · Art. 60 public database" },
  { ar: "إطار إدارة مخاطر الذكاء (NIST AI RMF)", en: "NIST AI RMF", scope: "GOVERN · MAP · MEASURE (incidents) · MANAGE" },
  { ar: "مبادرات منظمة التعاون للذكاء الاصطناعي", en: "OECD AI Principles", scope: "transparency · human oversight · advisory-only" },
  { ar: "التقييم الكندي لأثر الخوارزميات", en: "Canada Algorithmic Impact Assessment", scope: "public disclosure of automated systems" },
  { ar: "السجل الهولندي للخوارزميات", en: "Dutch Algorithm Register", scope: "public algorithm register" },
  { ar: "شراكة الحكومة المفتوحة (OGP)", en: "Open Government Partnership", scope: "transparency · public participation · accountability" },
  { ar: "أرشيف وطني — جدول الاحتفاظ", en: "National Archives — retention schedule", scope: "stated retention periods, permanent preservation" },
];

const CONTRACTS = [
  "ai-system-registry-1.0.0","ai-accountability","circulation-approval-1.0.0","ratification-route","retention","membership-effect-1.0.0","seated-readiness-1.0.0","institutional-change-1.0.0","execution-extract-1.0.0","annotation-continuity","continuity","proposal-content","material-change","decision-integrity","decision-lifecycle","meeting-lifecycle","evidence-acceptance","evidence-dossier","guest-access","file-access-policy","principal-representation","vote-eligibility","record-consistency","record-governance","governed-read","exception-catalogue","participation-matrix","audit-chain","metric-definitions","governance-surfaces","sovereign-standards",
];

const ENTITY_FAMILIES = [
  { ar: "الهوية المؤسسية", en: "Institutional identity", items: ["Organization","OrganizationPortal","OrganizationDirectory","OrganizationMembership","OrganizationAsset","OrganizationAccessRequest","OrganizationVerification","Institution","ExternalReference"] },
  { ar: "اللجنة وتشكيلها", en: "Committee & formation", items: ["Committee","CommitteeFormationVersion","CommitteeMandate","CommitteeAmendment","FoundingInstrument","CommitteeLifecycleEvent","CommitteeRelationship","CommitteeMember","CommitteeMembership","Workstream","WorkstreamMembership"] },
  { ar: "المقاعد والتعيين والاستمرارية", en: "Seats, appointments & continuity", items: ["SeatAppointmentEvent","AlternateActivation","Delegation","AuthorityDelegation","AuthorityGrant","HandoverPack","HandoverItem","Recusal","ConflictDeclaration","Representation"] },
  { ar: "الاجتماعات وجدول الأعمال", en: "Meetings & agenda", items: ["Meeting","AgendaItem","AgendaItemGuest","AgendaItemEvidenceRequirement","Attendance","MeetingPack","MeetingMinutes","Deliberation","Signature"] },
  { ar: "القرارات والتصويت والتداول", en: "Decisions, voting & circulation", items: ["Decision","Vote","CirculationRound","CirculationResponse","EligibleVoterSnapshot","IssueSnapshot","RatificationRoute","RatificationRecord","VotingRule","QuorumRule"] },
  { ar: "التنفيذ والأدلة", en: "Execution & evidence", items: ["Action","ActionExtractGrant","ActionClarification","EvidenceSubmissionEntry","CrossEntityDependency","TransitionClaim"] },
  { ar: "الذكاء الاصطناعي والمساءلة", en: "AI & accountability", items: ["AISystem","AIOutputLedger","AIIncident","AIExtractionJob"] },
  { ar: "الحوكمة والسيادة", en: "Governance & sovereignty", items: ["GovernanceConfig","MembershipEffectPolicy","RetentionRule","ChangeDisposition","PolicyScenario","FeatureFlag","BreakGlassAccess"] },
  { ar: "الوثائق والمراجعات", en: "Documents & reviews", items: ["Document","DocumentVersion","DocumentAccessGrant","Annotation","SharedComment","ReviewRequest","ReviewResponse","MandateReference","ExtractedInstrumentField","AmendmentReviewStage","InstrumentVersion"] },
  { ar: "الإشعارات والمراجعة والتدقيق", en: "Notifications, review & audit", items: ["NotificationOutbox","NotificationTemplate","NotificationConfig","NotificationPreference","AuditEvent","AuditLog","DocumentationAsset","DocumentationRelease","DocumentationDownloadLog"] },
];

const STACK_ROWS = [
  { ar: "الواجهة الأمامية", en: "Frontend", dAr: "React 18 · Vite · Tailwind CSS · shadcn/ui (Radix) · React Router", dEn: "React 18 · Vite · Tailwind CSS · shadcn/ui (Radix) · React Router" },
  { ar: "الخلفية والبيانات", en: "Backend & data", dAr: "Base44 (BaaS): كيانات · دوال خلفية · مسارات عمل · وكلاء · مصادقة", dEn: "Base44 (BaaS): entities · backend functions · workflows · agents · auth" },
  { ar: "الاستضافة والنشر", en: "Hosting & publishing", dAr: "Base44 Cloud — نشر فوري · دومين مخصّص lijan.base44.app · iOS/Android من نفس الكود", dEn: "Base44 Cloud — instant publish · custom domain lijan.base44.app · iOS/Android from the same code" },
  { ar: "الخطوط", en: "Fonts", dAr: "Noto Naskh Arabic (مُجمَّع محليًا) + Inter — دعم RTL كامل", dEn: "Noto Naskh Arabic (locally bundled) + Inter — full RTL support" },
  { ar: "اللغة", en: "Language", dAr: "JavaScript/JSX (الواجهة) · TypeScript (الدوال الخلفية) · ثنائية اللغة عربي/إنجليزي", dEn: "JavaScript/JSX (frontend) · TypeScript (backend functions) · bilingual Arabic/English" },
  { ar: "إدارة الحالة والبيانات", en: "State & data fetching", dAr: "TanStack React Query · React Context · اشتراكات لحظية للكيانات", dEn: "TanStack React Query · React Context · realtime entity subscriptions" },
  { ar: "المخططات والتصور", en: "Charts & visualization", dAr: "Recharts · react-leaflet (خرائط) · three.js (نماذج ثلاثية الأبعاد)", dEn: "Recharts · react-leaflet (maps) · three.js (3D models)" },
  { ar: "السحب والإفلات", en: "Drag & drop", dAr: "@hello-pangea/dnd", dEn: "@hello-pangea/dnd" },
  { ar: "النصوص الغنية", en: "Rich text", dAr: "react-quill-new · react-markdown", dEn: "react-quill-new · react-markdown" },
  { ar: "التصدير المكتبي", en: "Office export", dAr: "docx · exceljs · pptxgenjs · jszip · file-saver · html2canvas · jspdf", dEn: "docx · exceljs · pptxgenjs · jszip · file-saver · html2canvas · jspdf" },
  { ar: "النماذج والتحقق", en: "Forms & validation", dAr: "react-hook-form · zod", dEn: "react-hook-form · zod" },
  { ar: "الدفع", en: "Payments", dAr: "Stripe (متاح في المنطقة)", dEn: "Stripe (available in the region)" },
];

const ARCH_ROWS = [
  { ar: "المستوى 1 — المدخل", en: "Level 1 — Entry", dAr: "EntryPortal: بوابة الدخول · استكشاف المنصة (شخصيات محكومة) · السجل العمومي للجان · سجل الذكاء العمومي · التحقق من الوثائق", dEn: "EntryPortal: entry gate · platform exploration (governed personas) · public committees registry · public AI register · document verification" },
  { ar: "المستوى 2 — بوابة الجهة", en: "Level 2 — Organization portal", dAr: "OrgLayout: المؤسسة ولجانها وإشعاراتها وإدارتها وإنشاء لجنة جديدة", dEn: "OrgLayout: the institution, its committees, notifications, administration and new committee creation" },
  { ar: "المستوى 3 — مساحة اللجنة", en: "Level 3 — Committee workspace", dAr: "CommitteeLayout: ~40 سطحًا منظَّمًا في مراكز (الأشخاص · الاجتماعات · السجلات · التنفيذ · الذكاء · الحوكمة)", dEn: "CommitteeLayout: ~40 surfaces organized into hubs (People · Meetings · Records · Execution · Intelligence · Governance)" },
];

const SECURITY_ROWS = [
  { ar: "الأمان على مستوى الصف", en: "Row-Level Security", dAr: "RLS على كل كيان — قراءة مقيَّدة بالجهة الفاعلة، كتابة للمالك/المسؤول", dEn: "RLS on every entity — read scoped by the acting organization, write for owner/admin" },
  { ar: "نواة الصلاحية", en: "Authority kernel", dAr: "تقييم الصلاحية بلحظة الفعل من المقعد الفعّال (effective-time) لا الحالة المسجَّلة", dEn: "Authority evaluated at the instant of the act from the effective seat (effective-time), not the recorded status" },
  { ar: "نواة القدرة", en: "Capability kernel", dAr: "روابط الوصول المحدود (مستخلص · ضيف) بقدرة واحدة: رمز غير قابل للتخمين، ينتهي، يُلغى", dEn: "Scoped access links (extract · guest) carry one capability: an unguessable, expiring, revocable token" },
  { ar: "السجلات الإلحاقية", en: "Append-only records", dAr: "المصادقة · لقطة الإصدار · تعيين المقعد — لا تحديث ولا حذف", dEn: "Ratification · issue snapshot · seat appointment — no update, no delete" },
  { ar: "كسر الزجاج", en: "Break-glass", dAr: "BreakGlassAccess — وصول طارئ مُدقَّق لكل فعل", dEn: "BreakGlassAccess — audited emergency access for every act" },
  { ar: "سلسلة البرهان", en: "Proof chain", dAr: "بصمات محتوى (SHA-256) مُعاد تجزئتها عند كل قراءة — هضم لا إثبات صلاحية قانونية", dEn: "Content digests (SHA-256) re-hashed on every read — a digest, not proof of legal validity" },
  { ar: "الوصول للملفات", en: "File access", dAr: "RequestFileAccess + بوابة صلاحية ونطاق — لا روابط خام للملفات الخاصة", dEn: "RequestFileAccess + a scope/permission gateway — no raw links for private files" },
];

const DEPLOY_ROWS = [
  { ar: "الاستضافة", en: "Hosting", dAr: "Base44 Cloud — نشر فوري من البناء", dEn: "Base44 Cloud — instant publish from the build" },
  { ar: "الدومين", en: "Domain", dAr: "lijan.base44.app + دومين مخصّص قابل للتوصيل", dEn: "lijan.base44.app + a connectable custom domain" },
  { ar: "التطبيقات المحمولة", en: "Mobile apps", dAr: "iOS/Android من نفس الكود", dEn: "iOS/Android from the same code" },
  { ar: "مفاتيح الواجهة", en: "API keys", dAr: "مفاتيح Base44 خاصة بالتطبيق (لوحة التحكم ← API)", dEn: "App-owned Base44 API keys (dashboard ← API)" },
  { ar: "الأسرار", en: "Secrets", dAr: "متغيّرات بيئية للدوال الخلفية (لوحة التحكم ← Secrets)", dEn: "Environment variables for backend functions (dashboard ← Secrets)" },
  { ar: "السجلات", en: "Logs", dAr: "مستكشف سجلات تشغيلي (لوحة التحكم ← Logs)", dEn: "Runtime logs explorer (dashboard ← Logs)" },
  { ar: "التحليلات", en: "Analytics", dAr: "حركة ومراجعات جلسات + تتبّع أحداث مخصّصة", dEn: "Traffic and session replays + custom event tracking" },
];

export default function PlatformSpecification() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  return (
    <div className="min-h-app bg-background" dir={isAr ? "rtl" : "ltr"}>
      <header className="border-b border-border bg-card sticky top-[env(safe-area-inset-top)] z-30 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button onClick={() => navigate("/")} aria-label={isAr ? "العودة للرئيسية" : "Back to home"}
            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium">
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span className="hidden sm:inline">{isAr ? "الرئيسية" : "Home"}</span>
          </button>
          <BrandLogo className="h-8 w-28 shrink-0" />
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium hover:bg-primary/90">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? "طباعة / PDF" : "Print / PDF"}</span>
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 print:py-0">
        {/* فاصل + النسخة العربية الكاملة */}
        <LangDivider icon={Languages} ar="النسخة العربية الكاملة" en="Full Arabic Version" lang="ar" />
        <DocBody lang="ar" />

        {/* فاصل + النسخة الإنجليزية الكاملة */}
        <LangDivider icon={Languages} ar="النسخة الإنجليزية الكاملة" en="Full English Version" lang="en" />
        <DocBody lang="en" />

        <div className="mt-10 flex justify-center print:mt-6">
          <PoweredByConnection variant="dark" />
        </div>
      </main>
    </div>
  );
}

/* ── مستند كامل بلغة واحدة ── */
function DocBody({ lang }) {
  const isAr = lang === "ar";
  return (
    <LangCtx.Provider value={lang}>
      <div dir={isAr ? "rtl" : "ltr"} className="space-y-4">
        <IntroBlock />
        <Section n="1" ar="رؤية المنصة" en="Platform Vision">
          <P ar={<>لِجان™ |LIJAN™ نظام تشغيل وطني متكامل لإدارة المجالس واللجان، من التأسيس والتشكيل إلى الاجتماعات والمحاضر والقرارات والتنفيذ والمتابعة والإغلاق، ضمن بيئة مؤسسية آمنة قابلة للتدقيق تحفظ الذاكرة المؤسسية وتدعم اتخاذ القرار بذكاء منضبط. Powered by CONNECTION™.</>}
            en={<>LIJAN™ is an integrated national operating system for managing councils and committees — from founding and formation to meetings, minutes, decisions, execution, follow-up and closure — within a secure, auditable institutional environment that preserves institutional memory and supports disciplined, AI-assisted decision-making. Powered by CONNECTION™.</>} />
          <P ar={<>المهمة: تحويل إدارة اللجان من سجلات ورقية متفرقة إلى ذاكرة مؤسسية موحّدة قابلة للتدقيق، تُجيب على سؤال «ماذا قَرّرنا، ولماذا، ومن نفّذ، وما الدليل» في أي لحظة، وبأثر رجعي محفوظ لا يُعاد كتابته.</>}
            en={<>Mission: transform committee management from scattered paper records into a unified, auditable institutional memory that answers "what we decided, why, who executed, and what is the evidence" at any moment, with a preserved, non-rewritable historical record.</>} />
          <P ar={<>أركان الحوكمة الأربعة: حوكمة واضحة، قرارات موثقة، تنفيذ قابل للمتابعة، وذاكرة مؤسسية مستدامة. كل فعل حوكمة يستند إلى عقد إصدار مُجمَّد، وكل سجل رسمي مُلحَق فقط (لا يُعدَّل ولا يُحذف).</>}
            en={<>Four governance pillars: clear governance, documented decisions, trackable execution, and sustained institutional memory. Every governance act rests on a frozen, versioned contract; every official record is append-only (never edited, never deleted).</>} />
        </Section>

        <Section n="2" ar="المكدّس التقني والبنية التحتية" en="Technical Stack & Infrastructure">
          <Grid rows={STACK_ROWS} />
        </Section>

        <Section n="3" ar="معمارية التطبيق" en="Application Architecture">
          <P ar={<>ثلاثة مستويات للتنقّل، يُحمَّل كل مستوى بالتقسيم البرمجي (code-splitting) عند فتحه فقط:</>} en={<>Three navigation levels, each code-split and loaded only when opened:</>} />
          <Grid rows={ARCH_ROWS} />
          <P ar={<>المصادقة مملوكة للمنصة (رموز · جلسات · تحقق بالبريد)، والمسارات المحمية تُحاط بـ ProtectedRoute. لا تُبنى خلفية مصادقة مخصّصة. كل السطوح ثنائية اللغة مع تبديل RTL/LTR.</>}
            en={<>Auth is platform-owned (tokens, sessions, email verification); protected routes are gated by ProtectedRoute. No custom auth backend. All surfaces are bilingual with RTL/LTR switching.</>} />
        </Section>

        <Section n="4" ar="نموذج البيانات والحوكمة" en="Data & Governance Model">
          <P ar={<>أكثر من 100 كيان (مخططات JSON) منظَّمة في عائلات. كل سجل يحمل سمات مدمجة (id · created_date · updated_date · created_by_id). الأمان على مستوى الصف (RLS) يُطبَّق على كل كيان: قراءة مقيَّدة بالجهة الفاعلة، وكتابة للمالك أو المسؤول، وبعض السجلات (المصادقة · لقطة الإصدار · تعيين المقعد) «إلحاقي فقط» — لا تحديث ولا حذف.</>}
            en={<>Over 100 entities (JSON schemas) organized in families. Every record carries built-in attributes (id · created_date · updated_date · created_by_id). Row-Level Security (RLS) is applied to every entity: read scoped by the acting organization, write for the owner or admin, and certain records (ratification, issue snapshot, seat appointment) are "append-only" — no update, no delete.</>} />
          {ENTITY_FAMILIES.map((f, i) => <FamilyRow key={i} ar={f.ar} en={f.en} items={f.items} />)}
          <P ar={<>مبادئ الحوكمة الجوهرية: التقييم بلحظة الفعل (effective-time) لا بالحالة المسجَّلة فقط؛ هوية المقعد لا الشخص (المقعد يُقارَن بالمعرّف لا بالاسم)؛ الإشراف البشري إلزامي لكل ذكاء؛ كل مخرج ذكاء استشاري لا يُغيّر حالة الحوكمة؛ الفحص يحدث قبل دخول البيانات إلى السجل الرسمي (pre-record).</>}
            en={<>Core governance principles: evaluation at the instant of the act (effective-time), not just recorded status; seat identity over person identity (seats compared by identifier, never by name); mandatory human oversight for all AI; every AI output is advisory and never changes governance state; scanning occurs before data enters the official record (pre-record).</>} />
        </Section>

        <Section n="5" ar={`فهرس الدوال الخلفية (${TOTAL_FNS} دالة)`} en={`Backend Functions Catalog (${TOTAL_FNS} functions)`}>
          <P ar={<>كل دوال المنصّة (base44/functions) مرتبة حسب المجال. كل دالة مُصادَق عليها، مقيَّدة النطاق، وتُعيد استجابة JSON. الدوال الإدارية تتحقق من role === admin. الدوال العمومية (السجل العمومي للذكاء) لا تتطلب تسجيل دخول — الإفصاح التزام.</>}
            en={<>All platform functions (base44/functions) grouped by domain. Each is authenticated, scope-bounded, and returns a JSON response. Admin functions verify role === admin. Public functions (public AI register) require no sign-in — disclosure is an obligation.</>} />
          <FunctionGroupsList />
        </Section>

        <Section n="6" ar="التكاملات والوظائف من طرف ثالث" en="Integrations & Third-Party Functions">
          <Sub ar="دمج Core المدمج (منصة Base44)" en="Built-in Core integration (Base44)">
            <ul className="text-[12px] text-muted-foreground space-y-1 leading-relaxed">
              <Li ar={<><b>InvokeLLM</b> — استدعاء نماذج لغوية (gemini_3_flash · gpt_6 · claude_sonnet · automatic) مع بحث ويب اختياري ودعم للملفات</>} en={<><b>InvokeLLM</b> — LLM invocation (gemini_3_flash · gpt_6 · claude_sonnet · automatic) with optional web search and file support</>} />
              <Li ar={<><b>SendEmail</b> — إرسال بريد للمستخدمين المسجَّلين والقالب</>} en={<><b>SendEmail</b> — email to registered users + templates</>} />
              <Li ar={<><b>TranscribeAudio</b> — تفريغ صوتي (Whisper)</>} en={<><b>TranscribeAudio</b> — audio transcription (Whisper)</>} />
              <Li ar={<><b>SendPushNotification</b> — إشعار دفع أصيل للتطبيق المحمول</>} en={<><b>SendPushNotification</b> — native push for the mobile app</>} />
              <Li ar={<><b>UploadPrivateFile / UploadPublicFile</b> — رفع ملفات (خاص/عمومي)</>} en={<><b>UploadPrivateFile / UploadPublicFile</b> — file upload (private/public)</>} />
              <Li ar={<><b>CreateFileSignedUrl</b> — روابط موقّعة للملفات الخاصة</>} en={<><b>CreateFileSignedUrl</b> — signed URLs for private files</>} />
              <Li ar={<><b>GenerateImage / GenerateSpeech / GenerateVideo</b> — توليد وسائط بالذكاء</>} en={<><b>GenerateImage / GenerateSpeech / GenerateVideo</b> — AI media generation</>} />
              <Li ar={<><b>ExtractDataFromUploadedFile</b> — استخراج بيانات مهيكلة من الملفات المرفوعة</>} en={<><b>ExtractDataFromUploadedFile</b> — structured extraction from uploaded files</>} />
            </ul>
          </Sub>
          <Sub ar="موصلات OAuth مسجَّلة في مساحة العمل" en="Workspace-registered OAuth connectors">
            <P ar={<>Outlook Calendar · Google Calendar — لمزامنة الاجتماعات. الأوضاع: BYO Shared (رمز مشترك) أو App User (كل مستخدم يربط حسابه). تُستخدم عبر معرّف الموصل.</>}
              en={<>Outlook Calendar · Google Calendar — for meeting sync. Modes: BYO Shared (shared token) or App User (each user connects their own account). Used via the connector id.</>} />
          </Sub>
          <Sub ar="نسيج التكامل RAQEEM (محيّد المزوّد)" en="RAQEEM Integration Fabric (provider-neutral)">
            <P ar={<>كل أنظمة الخارج تُعالَج كقنوات قابلة للاستبدال عبر بوابة تكامل خلفية (IntegrationGateway). يُحفظ التعيين بين المنصّة والأنظمة الخارجية في كيان ExternalReference. يعمل النظام حتى انقطاع المزوّد (graceful degradation).</>}
              en={<>All external systems are treated as swappable channels through a backend integration gateway (IntegrationGateway). Mapping between the platform and external systems is held in the ExternalReference entity. The system degrades gracefully when a provider is offline.</>} />
          </Sub>
          <Sub ar="الحزم الخارجية المعتمدة (npm)" en="Approved external packages (npm)">
            <p className="text-[11px] text-muted-foreground font-mono leading-relaxed" dir="ltr">
              @base44/sdk · @tanstack/react-query · @hello-pangea/dnd · radix-ui · lucide-react · recharts · react-router-dom · react-hook-form · zod · date-fns · lodash · react-markdown · framer-motion · three · react-leaflet · react-quill-new · docx · exceljs · pptxgenjs · jspdf · jszip · file-saver · html2canvas · stripe · class-variance-authority · tailwind-merge
            </p>
            <P ar={<>لا يُسمح بأي مكتبة خارج القائمة المعتمدة — أي إضافة تكسر البناء. المكوّنات من @/components/ui (shadcn) فقط.</>}
              en={<>No library outside the approved list is permitted — any addition breaks the build. UI components come only from @/components/ui (shadcn).</>} />
          </Sub>
        </Section>

        <Section n="7" ar="الذكاء الاصطناعي المحكوم" en="Governed AI">
          <P ar={<>خمسة شروط سيادية للذكاء: (1) استشاري فقط، (2) مُسمَّى بوضوح، (3) مُسجَّل في AIOutputLedger، (4) اللجنة اختيارية في التفعيل، (5) يحدث قبل السجل لا داخله (pre-record). كل مخرج يحمل confidence_score وأساسها، ومراجعًا بشريًا، وحكم بشري نهائي عبر AIFeedbackPanel.</>}
            en={<>Five sovereign conditions for AI: (1) advisory only, (2) clearly labelled, (3) logged in AIOutputLedger, (4) committee-optional, (5) occurs before the record, not within it (pre-record). Every output carries a confidence_score and its basis, a human reviewer, and a final human verdict via AIFeedbackPanel.</>} />
          <P ar={<>سجل أنظمة الذكاء (AISystem) يفي بمتطلبات ISO 42001 §6.1.2/§8.3 وقانون الاتحاد الأوروبي؛ تقييم الأثر يُفصح عن المتأثرين والمخاطر والتدابير والإشراف. السجل العمومي للذكاء (GetPublicAIRegister) يُفصح للمواطن بلا تسجيل دخول. الحوادث (AIIncident) تُسجَّل وفق NIST AI RMF (MEASURE/MANAGE). تقرير المساءلة محسوب خادميًا (OECD/NIST).</>}
            en={<>The AI systems register (AISystem) satisfies ISO 42001 §6.1.2/§8.3 and the EU AI Act; impact assessment discloses affected parties, risks, mitigations and oversight. The public AI register (GetPublicAIRegister) discloses to citizens without sign-in. Incidents (AIIncident) are recorded per NIST AI RMF (MEASURE/MANAGE). The accountability report is server-computed (OECD/NIST).</>} />
        </Section>

        <Section n="8" ar="الأمان والصلاحيات" en="Security & Authority">
          <Grid rows={SECURITY_ROWS} />
        </Section>

        <Section n="9" ar="معايير السيادة والامتثال المعتمدة" en="Adopted Sovereignty & Compliance Standards">
          <div className="space-y-2">
            {STANDARDS.map((s, i) => <StandardRow key={i} ar={s.ar} en={s.en} scope={s.scope} />)}
          </div>
        </Section>

        <Section n="10" ar="العقود التشغيلية المُصدَّرة" en="Versioned Operational Contracts">
          <P ar={<>كل فعل حوكمة يستند إلى عقد بإصدار مُجمَّد يُسجَّل في السجل عند الفعل ولا يُعاد كتابته. هذه قائمة العقود المُصدَّرة في المنصة:</>}
            en={<>Every governance act rests on a frozen, versioned contract recorded on the record at the moment of the act and never rewritten. These are the contracts issued by the platform:</>} />
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed" dir="ltr">{CONTRACTS.join(" · ")}</p>
        </Section>

        <Section n="11" ar="النشر والواجهات البرمجية" en="Deployment & APIs">
          <Grid rows={DEPLOY_ROWS} />
        </Section>

        <Section n="12" ar="اتفاقيات التطوير وملاحظات التسليم" en="Development Conventions & Handover Notes">
          <ul className="text-[12px] text-muted-foreground space-y-1.5 leading-relaxed list-disc ps-5 rtl:ps-0 rtl:pe-5">
            <Li ar="كل ملف جديد مكوّن مستقل صغير (≤50 سطرًا) — لا إضافة لملفات كبيرة." en="Every new file is a small focused component (≤50 lines) — never appended to large files." />
            <Li ar="الاستيراد عبر @/ (alias) لا المسارات النسبية. cn من @/lib/utils." en="Imports via @/ alias, never relative paths. cn from @/lib/utils." />
            <Li ar="أيقونات lucide-react فقط وموجودة فعلاً. مكوّنات @/components/ui فقط." en="lucide-react icons only and must exist. Components from @/components/ui only." />
            <Li ar="ألوان الحالة عبر رموز state-* الدلالية — لا أزرق/سماوي/بنفسجي في الهوية." en="Status colors via semantic state-* tokens — no blue/cyan/violet in the identity." />
            <Li ar="Tailwind: classes حرفية في الكود فقط — يُقصّ ما ليس حرفيًا عند البناء." en="Tailwind: literal class strings only — purged otherwise at build." />
            <Li ar="الكيانات: مخطط JSON كامل دائمًا (لا تعليقات ولا placeholders)." en="Entities: always the full JSON schema (no comments or placeholders)." />
            <Li ar="الدوال الخلفية: createClientFromRequest + try/catch + Response.json. كل استدعاء SDK يُنتظر." en="Backend functions: createClientFromRequest + try/catch + Response.json. Every SDK call awaited." />
            <Li ar="القراءات: filter(query, {sort,limit,fields}) يُعيد صفحة — اقرأ .items. لا تحميل كل السجلات في الذاكرة." en="Reads: filter(query,{sort,limit,fields}) returns a page — read .items. Never load all records into memory." />
            <Li ar="المسارات في src/App.jsx: إضافة Route واحدة لكل صفحة جديدة، داخل البنية الموجودة دون إعادة كتابة." en="Routes in src/App.jsx: one Route per new page, within the existing scaffold, never a wholesale rewrite." />
            <Li ar="اللغة: طابق لغة المستخدم في المحادثة وواجهة التطبيق. RTL للعربية." en="Language: match the user's language in chat and app UI. RTL for Arabic." />
          </ul>
        </Section>

        <FooterBlock />
      </div>
    </LangCtx.Provider>
  );
}

/* ── فاصل بين المستندين ── */
function LangDivider({ icon: Icon, ar, en, lang }) {
  return (
    <div className="my-8 print:my-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <h2 className="text-lg font-bold text-primary">{lang === "ar" ? ar : en}</h2>
        <div className="flex-1 h-px bg-border" />
      </div>
    </div>
  );
}

/* ── مكوّنات العرض (تقرأ لغة المستند من السياق) ── */
function IntroBlock() {
  const t = useT();
  return (
    <div className="text-center mb-6 print:mb-4">
      <BrandLogo className="h-14 w-44 mx-auto mb-4" />
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("وثيقة المواصفات الفنية الشاملة", "Comprehensive Technical Specification")}</h1>
      <p className="text-sm text-muted-foreground mt-2">{t("رؤية المنصة · المعمارية · نموذج البيانات · الدوال الخلفية · التكاملات · معايير السيادة", "Vision · Architecture · Data Model · Backend Functions · Integrations · Sovereignty Standards")}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-1">{t("وثيقة تسليم لشركة تطوير — من الألف إلى الياء", "Handover document for a development company — from A to Z")}</p>
    </div>
  );
}

function FooterBlock() {
  const t = useT();
  return (
    <p className="text-center text-[10px] text-muted-foreground/70 pt-3 pb-2 print:pb-0">
      {t("لِجان™ — وثيقة المواصفات الفنية", "LIJAN™ — Technical Specification")} · {new Date().toLocaleDateString("en")}
    </p>
  );
}

function Section({ n, ar, en, children }) {
  return (
    <section className="raqeem-card p-5 sm:p-6 print:break-inside-avoid print:shadow-none print:border-border">
      <SecHeading n={n} ar={ar} en={en} />
      <div className="space-y-2.5 mt-3">{children}</div>
    </section>
  );
}

function SecHeading({ n, ar, en }) {
  const t = useT();
  return (
    <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground pb-2 border-b border-border">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">{n}</span>
      <span>{t(ar, en)}</span>
    </h2>
  );
}

function P({ ar, en }) {
  const t = useT();
  return <p className="text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed">{t(ar, en)}</p>;
}

function Li({ ar, en }) {
  const t = useT();
  return <li className="text-[12px] text-muted-foreground leading-relaxed">{t(ar, en)}</li>;
}

function Sub({ ar, en, children }) {
  const t = useT();
  return (
    <div className="mb-3">
      <h3 className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
        <ChevronRight className="w-3.5 h-3.5 text-primary" />
        {t(ar, en)}
      </h3>
      <div className="ps-5 rtl:ps-0 rtl:pe-5 border-s-2 rtl:border-s-0 rtl:border-e-2 border-border/60">{children}</div>
    </div>
  );
}

function Grid({ rows }) {
  const t = useT();
  return (
    <div className="rounded-md border border-border divide-y divide-border overflow-hidden">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 px-3 py-2 bg-secondary/10">
          <span className="text-[11px] font-semibold text-foreground col-span-1">{t(r.ar, r.en)}</span>
          <span className="text-[11px] text-muted-foreground col-span-2 leading-relaxed">{t(r.dAr, r.dEn)}</span>
        </div>
      ))}
    </div>
  );
}

function FamilyRow({ ar, en, items }) {
  const t = useT();
  return (
    <div className="mb-2">
      <p className="text-xs font-semibold text-foreground mb-1">{t(ar, en)}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed" dir="ltr">{items.join(" · ")}</p>
    </div>
  );
}

function FunctionGroupsList() {
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(FUNCTION_GROUPS.map((_, i) => [i, true])));
  const toggle = (i) => setOpenGroups((s) => ({ ...s, [i]: !s[i] }));
  return (
    <div className="space-y-1.5">
      {FUNCTION_GROUPS.map((g, i) => <FunctionGroupBlock key={i} g={g} i={i} open={openGroups[i]} onToggle={toggle} />)}
    </div>
  );
}

function FunctionGroupBlock({ g, i, open, onToggle }) {
  const t = useT();
  return (
    <div className="rounded-md border border-border bg-secondary/20">
      <button onClick={() => onToggle(i)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left">
        <span className="text-xs font-semibold text-foreground">{t(g.ar, g.en)} <span className="text-muted-foreground font-normal">({g.fns.length})</span></span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <p className="px-3 pb-2.5 text-[11px] text-muted-foreground leading-relaxed font-mono" dir="ltr">{g.fns.join(" · ")}</p>}
    </div>
  );
}

function StandardRow({ ar, en, scope }) {
  const t = useT();
  return (
    <div className="rounded-md border border-border bg-secondary/20 p-3">
      <p className="text-xs font-semibold text-foreground">{t(ar, en)}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5" dir="ltr">{scope}</p>
    </div>
  );
}