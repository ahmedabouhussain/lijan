import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  PACK_DRAFT_VERSION, PACK_DRAFT_REFUSALS,
  buildPackDraftPrompt, PACK_DRAFT_SCHEMA, parsePackDraft, auditPackDraftContract,
} from '../../shared/packDraft.ts';

// GenerateMeetingPackDraft — تجميع مسودة حزمة الاجتماع من ملفات المصدر (استشاري بحت).
// يولّد أقسامًا موسومة آليًا من المستندات المرفوعة + المخطط. لا يُنشئ حزمة ولا ينشرها:
// النشر فعل محكوم قائم (PublishMeetingPack). المسودة للأمين لينسّقها.
// السلطة على اللجنة المستهدفة (agenda.edit)، والملفات تُحل من مستندات اللجنة لا من الطلب.

const asArray = (x) => (Array.isArray(x) ? x : (x?.items || []));
const MAX_SOURCES = 8;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const { committee_id, meeting_id, outline, document_ids } = body || {};
    if (!committee_id || !meeting_id) {
      return Response.json({ error: 'committee_id and meeting_id are required' }, { status: 400 });
    }

    // السلطة على اللجنة المستهدفة (مثل PublishMeetingPack): من يملك agenda.edit يملك تجميع المسودة.
    const auth = await authorizeCommand(base44, {
      capability: 'agenda.edit',
      target_type: 'Committee',
      target_id: committee_id,
      mode: 'create',
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    // الملفات المصدر تُحل من مستندات اللجنة لا من الطلب: لا يُمرَّر رابط ملف من الخارج.
    const requestedIds = Array.isArray(document_ids) ? document_ids.filter((x) => typeof x === 'string' && x).slice(0, MAX_SOURCES) : [];
    let sourceDocs = [];
    if (requestedIds.length > 0) {
      const rows = asArray(await sr.entities.Document.filter({ id: { $in: requestedIds } }).catch(() => ({ items: [] })));
      // احتجاز النطاق: المستندات خارج اللجنة تُرفض كاملة لا تُرشّح.
      const outside = rows.some((d) => d.committee_id !== committee_id);
      if (outside) return Response.json({ error: 'A referenced document is outside this committee', code: 'source_out_of_scope' }, { status: 403 });
      sourceDocs = rows;
    }

    if (sourceDocs.length === 0) {
      return Response.json({
        status: 'not_evaluated', contract_version: PACK_DRAFT_VERSION, committee_id, meeting_id,
        reason: PACK_DRAFT_REFUSALS.no_sources, sections: [],
        ai_generated: true, advisory: true, writes_performed: 0,
      });
    }

    // اقرأ اجتماع اللجنة واجندته لإثراء الترتيب (تحقق أن الاجتماع يخص اللجنة).
    const meeting = await sr.entities.Meeting.get(meeting_id).catch(() => null);
    if (!meeting || meeting.committee_id !== committee_id) {
      return Response.json({ error: 'The meeting does not belong to this committee', code: 'meeting_out_of_scope' }, { status: 403 });
    }
    const agendaItems = asArray(await sr.entities.AgendaItem.filter({ meeting_id }).catch(() => ({ items: [] })));

    // اقرأ أحدث إصدار لكل مستند مصدر لتمرير روابطه إلى النموذج (file_urls).
    const versionRows = asArray(await sr.entities.DocumentVersion
      .filter({ document_id: { $in: sourceDocs.map((d) => d.id) }, status: 'current' }, { sort: '-uploaded_at', limit: MAX_SOURCES * 2 })
      .catch(() => ({ items: [] })));
    const fileUrlsByDoc = {};
    for (const v of versionRows) {
      if (!fileUrlsByDoc[v.document_id] && v.file_url) fileUrlsByDoc[v.document_id] = v.file_url;
    }
    const fileUrls = sourceDocs.map((d) => fileUrlsByDoc[d.id]).filter(Boolean);

    const prompt = buildPackDraftPrompt(meeting, sourceDocs, outline, agendaItems);

    let llmRaw;
    try {
      llmRaw = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: PACK_DRAFT_SCHEMA,
        ...(fileUrls.length ? { file_urls: fileUrls } : {}),
      });
    } catch (_e) {
      return Response.json({
        status: 'draft_unavailable', contract_version: PACK_DRAFT_VERSION, committee_id, meeting_id,
        reason: PACK_DRAFT_REFUSALS.draft_unavailable, sections: [],
        ai_generated: true, advisory: true, writes_performed: 0,
      });
    }

    const parsed = llmRaw && typeof llmRaw === 'object' && Array.isArray(llmRaw.sections) ? llmRaw : (typeof llmRaw === 'string' ? safeParse(llmRaw) : null);
    const { sections, dropped } = parsePackDraft(parsed || { sections: [] });

    const now = new Date().toISOString();
    let ledger = null;
    try {
      ledger = await sr.entities.AIOutputLedger.create({
        organization_id: auth.organization_id || null,
        output_type: 'meeting_pack_draft',
        source_entity_type: 'Meeting',
        source_entity_id: meeting_id,
        source_title: meeting.title_ar || meeting.title || null,
        committee_id,
        model_used: 'automatic',
        prompt_summary: 'تجميع مسودة حزمة اجتماع من ملفات المصدر (استشاري بحت)',
        output_summary: `${sections.length} قسم مُولَّد من ${sourceDocs.length} مستند${dropped.length ? ` · رُفض ${dropped.length} ناقص` : ''}`,
        structured_content: JSON.stringify({ sections, dropped, source_doc_ids: sourceDocs.map((d) => d.id) }),
        generated_at: now,
        generated_by_user_id: auth.user?.id || null,
        generated_by_name: auth.user?.full_name || auth.user?.email || null,
        human_reviewed: false,
        status: 'generated',
        confidence_score: typeof llmRaw?.confidence_score === 'number' ? llmRaw.confidence_score : null,
        confidence_basis: llmRaw?.confidence_basis ? String(llmRaw.confidence_basis) : null,
      });
    } catch (_e) { /* التسجيل لا يوقف */ }

    return Response.json({
      status: 'ok', contract_version: PACK_DRAFT_VERSION, committee_id, meeting_id,
      ledger_id: ledger?.id || null,
      confidence_score: typeof ledger?.confidence_score === 'number' ? ledger.confidence_score : null,
      confidence_basis: ledger?.confidence_basis || null,
      sections, dropped,
      source_doc_count: sourceDocs.length,
      advisory: true, ai_generated: true, generated_at: now, model_used: 'automatic',
      advisory_note: {
        ar: 'هذه المسودة استشاري بحت: لا تُنشئ حزمة ولا تنشرها. ينسّقها الأمين ثم ينشرها بأمر محكوم (PublishMeetingPack). كل قسم موسوم بمصدره، وكل مخرج موسوم «مولَّد آليًا» ومُسجَّل.',
        en: 'This draft is advisory only: it creates no pack and publishes nothing. The secretary curates it, then publishes it through a governed command (PublishMeetingPack). Every section names its source, and every output is labelled AI-generated and recorded.',
      },
      contract_check: auditPackDraftContract(),
      writes_performed: 1, // AIOutputLedger فقط؛ لم تُنشَأ حزمة.
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: PACK_DRAFT_VERSION }, { status: 500 });
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }