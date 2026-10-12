// pack-draft-1.0.0 — تجميع مسودة حزمة الاجتماع من ملفات المصدر (استشاري بحت).
//
// يولّد مسودة حزمة اجتماع من مستندات المصدر المرفوعة + مخطط، بأقسام موسومة آليًا. لا يُنشئ
// حزمة ولا ينشرها: الإصدار والنشر فعل محكوم قائم (PublishMeetingPack). هذا الفحص يُنتج المحتوى
// للأمين لينسّقه ثم ينشره. استشاري بحت: لا يكتب حالة ولا يوقف فعلًا.
//
// خمسة شروط حاكمة (رؤية لجان للذكاء): استشاري بحت · موسوم ومُسجَّل في AIOutputLedger · قبل السجل
// (المسودة قبل نشر الحزمة) · سيادة البيانات · لا يُخترع ما ليس في المصدر (قسم بلا مصدر يُرفض).
//
// قاعدتا الصدق: بلا مصدر ⇒ «غير مُقيَّم» لا «مسودة». وقسم بلا سند من المصدر يُسقَط لا يُكتب.

export const PACK_DRAFT_VERSION = 'pack-draft-1.0.0';

export const PACK_DRAFT_REFUSALS = {
  no_sources: {
    ar: 'لا توجد ملفات مصدر مرفوعة تُبنى منها المسودة: لم تُرفع مستندات للجنة بعد، فلا تُولَّد مسودة ولا يُدَّعى أنها جاهزة.',
    en: 'No source files to build from: no documents have been uploaded for the committee yet, so no draft is generated and none is claimed ready.',
  },
  draft_unavailable: {
    ar: 'تعذّر توليد المسودة الآن؛ لم تُكتب حالة. أعِد المحاولة لاحقًا.',
    en: 'The draft could not be generated now; no state was written. Try again later.',
  },
};

export function buildPackDraftPrompt(meeting, sourceDocs, outline, agendaItems) {
  const sourceList = (sourceDocs || [])
    .map((d, i) => `${i + 1}. ${d.title || d.title_ar || 'مستند'} (النوع: ${d.document_type || 'مرفق'})`)
    .join('\n');
  const agendaText = (agendaItems || [])
    .map((item, i) => `${i + 1}. ${item.title_ar || item.title || ''} — ${item.objective_ar || item.objective || ''}`)
    .join('\n');

  return `أنت أمين سر حكومي خبير في تجميع حزم اجتماعات اللجان الوطنية باللغة العربية الفصحى.
ابنِ مسودة حزمة اجتماع من مستندات المصدر المرفقة والمخطط المقدَّم، بأقسام منظمة جاهزة للمراجعة.

أنتج مصفوفة sections، كل قسم:
- title: عنوان القسم (مثل: «تمهيد» · «بند الأجندة الأول» · «القرارات المقترحة» · «المرفقات»).
- body_ar: محتوى القسم بالعربية الفصحى الرسمية، مأخوذ من مستندات المصدر والمخطط.
- source_ref: اسم المستند/المصدر الذي بُني عليه القسم (أو «مخطط» إن بُني على المخطط وحده).

قواعد إلزامية:
- لا تخترع محتوى ليس في المصدر أو المخطط. كل قسم يستند إلى source_ref صريح.
- إن لم تجد محتوى لقسم، لا تُضِفه — لا تملأ الفراغ بالاختراع.
- التزم بالمخطط إن وُجد في ترتيب الأقسام.
- لا وسوم HTML. نص خالص قابل للنسخ.

عنوان الاجتماع: ${meeting?.title_ar || meeting?.title || ''}
${outline ? `المخطط المطلوب:\n${outline}` : 'لا يوجد مخطط محدد — رتّب الأقسام وفق جدول الأعمال والمصادر.'}

مستندات المصدر المتاحة:
${sourceList || '(لا توجد مستندات)'}

جدول الأعمال:
${agendaText || '(لا توجد بنود)'}

أعد النتيجة بصيغة JSON: { "sections": [ { "title": "...", "body_ar": "...", "source_ref": "..." } ] }`;
}

export const PACK_DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body_ar: { type: 'string' },
          source_ref: { type: 'string' },
        },
        required: ['title', 'body_ar', 'source_ref'],
      },
    },
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    confidence_basis: { type: 'string' },
  },
  required: ['sections'],
};

export function parsePackDraft(raw) {
  const data = raw && typeof raw === 'object' && Array.isArray(raw.sections) ? raw : { sections: [] };
  const sections = [];
  const dropped = [];
  for (const s of data.sections || []) {
    const title = String(s?.title || '').trim();
    const body = String(s?.body_ar || '').trim();
    const ref = String(s?.source_ref || '').trim();
    if (!title || !body || !ref) { dropped.push({ reason: 'incomplete_section' }); continue; }
    sections.push({ title, body_ar: body, source_ref: ref });
  }
  return { sections, dropped };
}

export function auditPackDraftContract() {
  const findings = [];
  if (!PACK_DRAFT_SCHEMA?.properties?.sections?.items?.properties?.source_ref) findings.push({ code: 'schema_missing_source_ref' });
  if (!PACK_DRAFT_REFUSALS.no_sources) findings.push({ code: 'refusal_missing' });
  return { ok: findings.length === 0, findings };
}