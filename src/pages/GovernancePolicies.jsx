import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, ShieldCheck, Lock, FileText, Scale, Eye, Layers } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { Image } from "@/components/ui/image";
import PoweredByConnection from "@/components/brand/PoweredByConnection";

export default function GovernancePolicies() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const [activeTab, setActiveTab] = useState("governance");

  const tabs = [
    { key: "governance", icon: Scale, labelAr: "سياسة الحوكمة", labelEn: "Governance Policy" },
    { key: "classification", icon: Layers, labelAr: "سياسة التصنيف المؤسسي", labelEn: "Institutional Classification Policy" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-[env(safe-area-inset-top)] z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span className="hidden sm:inline">{isAr ? "رجوع" : "Back"}</span>
          </button>
          <div className="h-9 w-28 overflow-hidden shrink-0">
            <Image
              src="https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/8c4576066_image.png"
              alt="LIJAN™"
              fittingType="fit"
              className="w-full h-full"
            />
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              سياسات الحوكمة والتصنيف المؤسسي
              <span className="block text-lg sm:text-xl text-muted-foreground font-medium mt-1" dir="ltr">
                Governance & Institutional Classification Policies
              </span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              تحدد هذه السياسات الإطار المؤسسي لاستخدام منصة لِجان™ وحماية المعلومات والسلوك الحوكمي المعتمد.
              <span className="block mt-1" dir="ltr">
                These policies define the institutional framework for using the LIJAN™ platform, information protection, and approved governance conduct.
              </span>
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-col sm:flex-row gap-2 mb-8 justify-center">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.labelAr} · <span dir="ltr">{tab.labelEn}</span></span>
                </button>
              );
            })}
          </div>

          {/* Policy Content */}
          <div className="raqeem-card p-6 sm:p-10">
            {activeTab === "governance" ? <GovernancePolicyContent /> : <ClassificationPolicyContent />}
          </div>

          {/* Footer */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <PoweredByConnection variant="dark" />
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed max-w-md">
              باستخدامك للمنصة فإنك توافق على الالتزام بهذه السياسات. آخر تحديث: سبتمبر 2026.
              <span className="block" dir="ltr">By using this platform you agree to comply with these policies. Last updated: September 2026.</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Bilingual Section Row ── */
function BilingualSection({ icon: Icon, number, titleAr, titleEn, bodyAr, bodyEn }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground" dir="rtl">{titleAr}</h3>
          <h3 className="text-sm font-semibold text-muted-foreground" dir="ltr">{titleEn}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl">{bodyAr}</p>
        <p className="text-sm text-muted-foreground leading-relaxed" dir="ltr">{bodyEn}</p>
      </div>
    </div>
  );
}

/* ── Governance Policy ── */
function GovernancePolicyContent() {
  const sections = [
    {
      icon: Scale,
      titleAr: "١. النطاق والغرض",
      titleEn: "1. Scope & Purpose",
      bodyAr: "تطبّق سياسة الحوكمة هذه على جميع المستخدمين والجهات المؤسسية على منصة لِجان™. الهدف هو ضمان أن تكون عمليات تشكيل اللجان واتخاذ القرارات وإصدار الوثائق مؤسسية، موثّقة، وقابلة للتدقيق.",
      bodyEn: "This governance policy applies to all users and institutional entities on the LIJAN™ platform. Its purpose is to ensure that committee formation, decision-making, and document issuance are institutional, documented, and auditable.",
    },
    {
      icon: FileText,
      titleAr: "٢. السلطة المؤسسة",
      titleEn: "2. Institutional Authority",
      bodyAr: "كل لجنة يجب أن تستند إلى صلاحية (Mandate) موثّقة ومرجع تأسيسي معتمد (قرار، مرسوم، ميثاق). لا تُنشأ لجنة دون مرجع قانوني أو تنظيمي واضح يحدد نطاقها وصلاحياتها.",
      bodyEn: "Every committee must be grounded in a documented mandate and an approved establishing instrument (decision, decree, charter). No committee is created without a clear legal or regulatory reference defining its scope and authority.",
    },
    {
      icon: Eye,
      titleAr: "٣. الشفافية والتدقيق",
      titleEn: "3. Transparency & Auditability",
      bodyAr: "جميع القرارات والمحاضر والوثائق الرسمية تُسجّل في سجل تدقيق دائم. يحق للجهات المخوّلة بالتدقيق مراجعة سلسلة الإثبات (Proof Chain) لكل قرار من المنشأ حتى النشر.",
      bodyEn: "All decisions, minutes, and official records are logged in a permanent audit trail. Authorized audit bodies may review the Proof Chain of any decision from origin to publication.",
    },
    {
      icon: Lock,
      titleAr: "٤. فصل الصلاحيات",
      titleEn: "4. Separation of Duties",
      bodyAr: "تُطبّق مبادئ فصل الصلاحيات بين منشئ القرار، المُعتمِد، والمنفّذ. لا يجوز لشخص واحد أن يجمع صلاحيتي الإنشاء والاعتماد النهائي للوثيقة الرسمية نفسها.",
      bodyEn: "Principles of separation of duties are enforced between the decision drafter, approver, and executor. No single person may hold both creation and final approval authority for the same official document.",
    },
    {
      icon: Scale,
      titleAr: "٥. النصاب والتصويت",
      titleEn: "5. Quorum & Voting",
      bodyAr: "تُتخذ القرارات وفق قاعدة النصاب المحددة للجنة (بسيطة، ثلثين، إجماع، أو يقررها الرئيس). تُسجّل أصوات الامتناع والتحفظات في المحضر الرسمي ولا تُمحى.",
      bodyEn: "Decisions are taken according to the committee's defined quorum rule (simple majority, two-thirds, unanimous, or chair-decides). Abstentions and reservations are recorded in the official minutes and never erased.",
    },
    {
      icon: FileText,
      titleAr: "٦. إدارة التعارض",
      titleEn: "6. Conflict of Interest Management",
      bodyAr: "على العضو الإفصاح عن أي تعارض مصالح قبل المداولات أو التصويت. يُسجّل التنحي (Recusal) رسمياً ويُستبعد العضو من التصويت على البند المعني دون حرمان من المداولة.",
      bodyEn: "A member must disclose any conflict of interest before deliberations or voting. Recusal is formally recorded and the member is excluded from voting on the relevant item without losing the right to deliberate.",
    },
    {
      icon: Eye,
      titleAr: "٧. الذاكرة المؤسسية",
      titleEn: "7. Institutional Memory",
      bodyAr: "تُحفظ الذاكرة المؤسسية للجنة عبر دورات التشكيل والتعديلات. عند تجديد اللجنة أو تعديل تشكيلها، تُنقل المعرفة والسياقات والقرارات السابقة إلى التشكيل الجديد لضمان الاستمرارية الحوكمية.",
      bodyEn: "Committee institutional memory is preserved across formation cycles and amendments. Upon committee renewal or formation change, knowledge, context, and prior decisions are transferred to the new formation to ensure governance continuity.",
    },
    {
      icon: Lock,
      titleAr: "٨. الامتثال والعقوبات",
      titleEn: "8. Compliance & Sanctions",
      bodyAr: "أي مخالفة لهذه السياسة (تزوير، تجاوز صلاحية، إتلاف سجل) تُحال إلى مراجعة إدارية. قد تؤدي إلى تعليق الصلاحيات أو إغلاق اللجنة مؤقتاً ريثما تُستكمل المراجعة.",
      bodyEn: "Any breach of this policy (falsification, authority override, record destruction) is referred for administrative review. It may result in suspension of privileges or temporary committee closure pending review completion.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground" dir="rtl">سياسة الحوكمة المؤسسية</h2>
        <h2 className="text-lg font-semibold text-muted-foreground" dir="ltr">Institutional Governance Policy</h2>
        <p className="text-sm text-muted-foreground mt-2" dir="rtl">
          الإطار الحوكمي المعتمد لإدارة المجالس واللجان على المنصة.
        </p>
        <p className="text-sm text-muted-foreground" dir="ltr">
          The approved governance framework for managing councils and committees on the platform.
        </p>
      </div>
      {sections.map((s, i) => (
        <BilingualSection key={i} {...s} />
      ))}
    </div>
  );
}

/* ── Classification Policy ── */
function ClassificationPolicyContent() {
  const { t } = useLanguage();
  const levels = [
    {
      levelAr: "عام",
      levelEn: "Public",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      descAr: "معلومات يمكن نشرها للعموم دون قيود. لا تتطلب ضوابط وصول خاصة.",
      descEn: "Information that may be published to the public without restrictions. No special access controls required.",
    },
    {
      levelAr: "داخلي",
      levelEn: "Internal",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      descAr: "معلومات للاستخدام الداخلي للجهة وأعضاء اللجان. لا تُنشر خارج السياق المؤسسي.",
      descEn: "Information for internal use by the entity and committee members. Not published outside the institutional context.",
    },
    {
      levelAr: "سري",
      levelEn: "Confidential",
      color: "bg-amber-100 text-amber-700 border-amber-200",
      descAr: "معلومات حساسة تُقيّد الوصول إليها للأشخاص المخوّلين فقط. تُسجّل عمليات الاطلاع.",
      descEn: "Sensitive information restricted to authorized persons only. Access events are logged.",
    },
    {
      levelAr: "مقيّد",
      levelEn: "Restricted",
      color: "bg-orange-100 text-orange-700 border-orange-200",
      descAr: "معلومات عالية الحساسية. الوصول بموافقة مسبقة وتوقيع التزام. يُمنع النسخ أو الإخراج.",
      descEn: "Highly sensitive information. Access requires prior approval and a signed undertaking. Copying or extraction prohibited.",
    },
    {
      levelAr: "عالي التقييد",
      levelEn: "Highly Restricted",
      color: "bg-red-100 text-red-700 border-red-200",
      descAr: "أعلى مستوى حماية. وصول محدود جداً ومراقب. أي تسريب يُعدّ خرقاً جسيماً.",
      descEn: "Highest protection level. Very limited and monitored access. Any leak constitutes a serious breach.",
    },
  ];

  const rules = [
    {
      ar: "تُطبّق سياسة التصنيف الافتراضية للجهة على جميع الوثائق والقرارات والمحاضر ما لم يُحدد خلاف ذلك.",
      en: "The entity's default classification policy applies to all documents, decisions, and minutes unless otherwise specified.",
    },
    {
      ar: "يُحدّد مستوى التصنيف عند إنشاء الوثيقة ولا يُخفّض إلا بموافقة الجهة المخوّلة وتسجيل سبب التغيير.",
      en: "Classification level is set at document creation and may only be downgraded by an authorized body with the reason recorded.",
    },
    {
      ar: "تُورّث الوثائق المشتقة (محاضر، تقارير) تصنيف أعلى مصدرها ما لم تُنقّى صراحةً.",
      en: "Derived documents (minutes, reports) inherit the higher classification of their source unless explicitly sanitized.",
    },
    {
      ar: "تُسجّل عمليات الاطلاع والتنزيل للوثائق المصنّفة «سري» فأعلى في سجل التدقيق.",
      en: "Access and download events for documents classified 'Confidential' or higher are logged in the audit trail.",
    },
    {
      ar: "يُمنع نسخ أو إخراج أو تصوير الوثائق المصنّفة «مقيّد» و«عالي التقييد» خارج المنصة.",
      en: "Copying, extracting, or photographing documents classified 'Restricted' and 'Highly Restricted' outside the platform is prohibited.",
    },
    {
      ar: "عند انتهاء اللجنة أو إغلاقها، تُحفظ الوثائق وفق سياسة الاحتفاظ المحددة للجهة (افتراضياً 7 سنوات).",
      en: "Upon committee termination or closure, documents are retained per the entity's retention policy (default 7 years).",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground" dir="rtl">سياسة التصنيف المؤسسي</h2>
        <h2 className="text-lg font-semibold text-muted-foreground" dir="ltr">Institutional Classification Policy</h2>
        <p className="text-sm text-muted-foreground mt-2" dir="rtl">
          مستويات التصنيف المعتمدة وقواعد التعامل مع المعلومات المؤسسية.
        </p>
        <p className="text-sm text-muted-foreground" dir="ltr">
          Approved classification levels and rules for handling institutional information.
        </p>
      </div>

      {/* Classification Levels */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {t("مستويات التصنيف", "Classification Levels")}
        </h3>
        <div className="space-y-3">
          {levels.map((l, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-lg border border-border bg-secondary/20">
              <div className="flex flex-col gap-1 shrink-0">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border w-fit ${l.color}`} dir="rtl">
                  {l.levelAr}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border w-fit ${l.color}`} dir="ltr">
                  {l.levelEn}
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl">{l.descAr}</p>
                <p className="text-sm text-muted-foreground leading-relaxed" dir="ltr">{l.descEn}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Handling Rules */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {t("قواعد التعامل", "Handling Rules")}
        </h3>
        <ul className="space-y-3">
          {rules.map((r, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl">{r.ar}</p>
                <p className="text-sm text-muted-foreground leading-relaxed" dir="ltr">{r.en}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}