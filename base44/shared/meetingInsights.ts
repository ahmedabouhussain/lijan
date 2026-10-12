// meeting-insights-1.0.0 — التحضير الذكي للاجتماع وملخص الحزمة (استشاري بحت).
//
// عقدان تحت مظلة واحدة، لأنهما يخدمان الهدف نفسه: تجهيز الرئيس/الأمين قبل الاجتماع، وتلخيص
// الحزمة للجهات الإشرافية بعد النشر. كلاهما استشاري بحت: لا يكتب حالة ولا يوقف فعلًا.
//
// خمسة شروط حاكمة (رؤية لجان للذكاء): استشاري بحت · موسوم ومُسجَّل في AIOutputLedger · قبل السجل
// (التحضير قبل الاجتماع، والملخص بعد نشر الحزمة لا داخلها) · سيادة البيانات · لا يُخترع ما ليس
// في النص (سؤال بلا بند يُرفض، وملخص بلا مصدر يُرفض).
//
// قاعدتا الصدق: بلا أجندة ⇒ «غير مُقيَّم» لا «جاهز». وملخص بلا حزمة منشورة ⇒ «غير مُقيَّم» لا «ملخص».

export const MEETING_INSIGHTS_VERSION = 'meeting-insights-1.0.0';

export const INSIGHTS_REFUSALS = {
  no_agenda: {
    ar: 'لا توجد بنود أجندة يُحضَّر لها: الاجتماع بلا جدول بعد، فلا يُولَّد تحضير ولا يُدَّعى جاهزية.',
    en: 'No agenda items to prepare for: the meeting has no agenda yet, so no prep is generated and no readiness is claimed.',
  },
  no_pack: {
    ar: 'لا توجد حزمة منشورة يُلخَّصها: لم يُنشر بعد حزمة للاجتماع، فلا يُولَّد ملخص ولا يُدَّعى أنه شامل.',
    en: 'No published pack to summarize: no pack has been published for the meeting yet, so no summary is generated and none is claimed complete.',
  },
  insights_unavailable: {
    ar: 'تعذّر توليد التحضير/الملخص الآن؛ لم تُكتب حالة. أعِد المحاولة لاحقًا.',
    en: 'The insights could not be generated now; no state was written. Try again later.',
  },
};

// ── التحضير الذكي ──────────────────────────────────────────────────────────────────

export function buildPrepPrompt(meeting, agendaItems, lastPackNote) {
  const agendaText = (agendaItems || [])
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    .map((item, i) => `${i + 1}. [${item.id || 'بند'}] ${item.title_ar || item.title || ''} — ${item.objective_ar || item.objective || ''}${item.presenter ? ` | المقدم: ${item.presenter}` : ''}${item.required_decision ? ` | القرار المطلوب: ${item.required_decision}` : ''}`)
    .join('\n');

  return `أنت مستشار حوكمة خبير في تحضير رؤساء وأمناء اللجان الحكومية قبل الاجتماع.
حلّل جدول أعمال الاجتماع التالي وأنتج تحضيرًا ذكيًا لكل بند.

لكل بند أجندة، أعِد:
- questions: 2 إلى 4 أسئلة محتملة قد يطرحها الأعضاء على البند (واقعية، مرتبطة بنص البند).
- inconsistencies: إن وُجدت فجوات أو تناقضات داخل البند أو بينه وبين غيره (أو مصفوفة فارغة).

ثم across_items: تناقضات بين بنود الأجندة (إن وُجدت)، و deltas: فروقات جوهرية عن آخر حزمة إن أُرفقت.

قواعد إلزامية:
- لا تخترع أسئلة بلا صلة بالبند. كل سؤال مرتبط بنص البند.
- إن لم تجد تناقضات، أعد مصفوفة فارغة — لا تختلق.
- explanation/label بالعربية الفصحى الرسمية.

عنوان الاجتماع: ${meeting?.title_ar || meeting?.title || ''}
${lastPackNote ? `ملاحظة آخر حزمة: ${lastPackNote}` : ''}

جدول الأعمال:
${agendaText || '(لا توجد بنود)'}

أعد النتيجة بصيغة JSON: { "items": [ { "agenda_item_id": "...", "questions": ["..."], "inconsistencies": ["..."] } ], "cross_item_inconsistencies": ["..."], "deltas_from_last": ["..."] }`;
}

export const PREP_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          agenda_item_id: { type: 'string' },
          questions: { type: 'array', items: { type: 'string' } },
          inconsistencies: { type: 'array', items: { type: 'string' } },
        },
        required: ['agenda_item_id', 'questions'],
      },
    },
    cross_item_inconsistencies: { type: 'array', items: { type: 'string' } },
    deltas_from_last: { type: 'array', items: { type: 'string' } },
  },
  required: ['items'],
};

export function parsePrepInsights(raw) {
  const data = raw && typeof raw === 'object' && Array.isArray(raw.items) ? raw : { items: [] };
  const items = [];
  const dropped = [];
  for (const it of data.items || []) {
    const id = String(it?.agenda_item_id || '').trim();
    const questions = Array.isArray(it?.questions) ? it.questions.map((q) => String(q || '').trim()).filter(Boolean) : [];
    if (!id || questions.length === 0) { dropped.push({ reason: 'incomplete_item' }); continue; }
    items.push({
      agenda_item_id: id,
      questions,
      inconsistencies: Array.isArray(it?.inconsistencies) ? it.inconsistencies.map((x) => String(x || '').trim()).filter(Boolean) : [],
    });
  }
  const cross = Array.isArray(data.cross_item_inconsistencies) ? data.cross_item_inconsistencies.map((x) => String(x || '').trim()).filter(Boolean) : [];
  const deltas = Array.isArray(data.deltas_from_last) ? data.deltas_from_last.map((x) => String(x || '').trim()).filter(Boolean) : [];
  return { items, cross_item_inconsistencies: cross, deltas_from_last: deltas, dropped };
}

// ── ملخص الحزمة ─────────────────────────────────────────────────────────────────────

export function buildSummaryPrompt(meeting, agendaItems, decisions, packTitle) {
  const agendaText = (agendaItems || [])
    .map((item, i) => `${i + 1}. ${item.title_ar || item.title || ''} — ${item.objective_ar || item.objective || ''}`)
    .join('\n');
  const decisionsText = (decisions || [])
    .map((d, i) => `${i + 1}. ${d.title_ar || d.title || ''}${d.status ? ` — ${d.status}` : ''}`)
    .join('\n');

  return `أنت أمين سر حكومي خبير في كتابة ملخصات حزم اجتماعات اللجان الوطنية باللغة العربية الفصحى.
اكتب ملخصًا منظمًا لحزمة اجتماع منشورة، موجَّهًا للجهات الإشرافية وأعضاء اللجان الفرعية الذين لا يجلسون في اللجنة لكن يتابعونها.

أنتج:
- overview_ar: فقرة عربية واحدة (3-4 أسطر) تختصر موضوع الاجتماع وأهم ما يُتوقع.
- overview_en: مقابلها بالإنجليزية.
- sections: مصفوفة من الأقسام، كل قسم: { title, summary_ar, summary_en } — لكل بند أجندة قسم، وللقرارات قسم إن وُجدت.

قواعد إلزامية:
- لا تخترع بنودًا أو قرارات غير موجودة في البيانات.
- الملخص يذكر المصدر (بند/قرار) ولا يُضيف من عنده.
- إن لم توجد قرارات، لا تُنشئ قسمًا لها.

عنوان الحزمة: ${packTitle || meeting?.title_ar || meeting?.title || ''}
جدول الأعمال:
${agendaText || '(لا توجد بنود)'}
القرارات:
${decisionsText || '(لا توجد قرارات)'}

أعد النتيجة بصيغة JSON: { "overview_ar": "...", "overview_en": "...", "sections": [ { "title": "...", "summary_ar": "...", "summary_en": "..." } ] }`;
}

export const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    overview_ar: { type: 'string' },
    overview_en: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary_ar: { type: 'string' },
          summary_en: { type: 'string' },
        },
        required: ['title', 'summary_ar', 'summary_en'],
      },
    },
  },
  required: ['overview_ar', 'overview_en', 'sections'],
};

export function parsePackSummary(raw) {
  if (!raw || typeof raw !== 'object') return { overview_ar: '', overview_en: '', sections: [], dropped: 1 };
  const overview_ar = String(raw.overview_ar || '').trim();
  const overview_en = String(raw.overview_en || '').trim();
  const sections = [];
  const dropped = [];
  for (const s of Array.isArray(raw.sections) ? raw.sections : []) {
    const title = String(s?.title || '').trim();
    const sar = String(s?.summary_ar || '').trim();
    const sen = String(s?.summary_en || '').trim();
    if (!title || !sar || !sen) { dropped.push({ reason: 'incomplete_section' }); continue; }
    sections.push({ title, summary_ar: sar, summary_en: sen });
  }
  return { overview_ar, overview_en, sections, dropped };
}

// ── فحص العقد ──────────────────────────────────────────────────────────────────────

export function auditMeetingInsightsContract() {
  const findings = [];
  if (!PREP_SCHEMA?.properties?.items?.items?.properties?.questions) findings.push({ code: 'prep_schema_missing' });
  if (!SUMMARY_SCHEMA?.properties?.sections?.items?.properties?.summary_ar) findings.push({ code: 'summary_schema_missing' });
  if (!INSIGHTS_REFUSALS.no_agenda || !INSIGHTS_REFUSALS.no_pack) findings.push({ code: 'refusal_missing' });
  return { ok: findings.length === 0, findings };
}

export function hasAgendaContent(agendaItems) {
  return Array.isArray(agendaItems) && agendaItems.length > 0
    && agendaItems.some((it) => (it.title_ar || it.title || it.objective_ar || it.objective) && String(it.title_ar || it.title || it.objective_ar || it.objective).trim());
}