import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolvePrincipal, authorizeRead, refusalBody, refusalStatus } from '../../shared/governedReadPolicy.ts';
import {
  MEETING_INSIGHTS_VERSION, INSIGHTS_REFUSALS,
  buildSummaryPrompt, SUMMARY_SCHEMA, parsePackSummary,
} from '../../shared/meetingInsights.ts';

// SummarizeMeetingPack — ملخص حزمة الاجتماع للجهات الإشرافية (قراءة محكومة، استشاري بحت).
// يلخّص الحزمة المنشورة لمن لا يجلس في اللجنة لكن يتابعها. لا يُستبدل قراءة الحزمة.

const asArray = (x) => (Array.isArray(x) ? x : (x?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const { meeting_id, showcase_token } = body || {};
    if (!meeting_id) return Response.json({ error: 'meeting_id is required' }, { status: 400 });

    const callerUser = await base44.auth.me().catch(() => null);
    const principal = await resolvePrincipal({ sr, body: { showcase_token }, callerUser });

    const meeting = await sr.entities.Meeting.get(meeting_id).catch(() => null);
    if (!meeting) return Response.json(refusalBody('not_found'), { status: refusalStatus('not_found') });

    const allowed = await authorizeRead({ base44, sr, principal, record: meeting });
    if (!allowed.allowed) return Response.json(refusalBody(allowed.reason), { status: refusalStatus(allowed.reason) });

    const [packs, agendaRows, decisionRows] = await Promise.all([
      sr.entities.MeetingPack.filter({ meeting_id, status: 'published' }, { sort: '-published_at', limit: 1 }).catch(() => ({ items: [] })),
      sr.entities.AgendaItem.filter({ meeting_id }).catch(() => ({ items: [] })),
      sr.entities.Decision.filter({ meeting_id }).catch(() => ({ items: [] })),
    ]);
    const pack = asArray(packs)[0] || null;
    const agendaItems = asArray(agendaRows);
    const decisions = asArray(decisionRows);

    if (!pack) {
      return Response.json({
        status: 'not_evaluated', contract_version: MEETING_INSIGHTS_VERSION, meeting_id,
        reason: INSIGHTS_REFUSALS.no_pack, overview_ar: '', overview_en: '', sections: [],
        ai_generated: true, advisory: true, writes_performed: 0,
      });
    }

    const prompt = buildSummaryPrompt(meeting, agendaItems, decisions, pack.title_ar || pack.title);

    let llmRaw;
    try {
      llmRaw = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: SUMMARY_SCHEMA });
    } catch (_e) {
      return Response.json({
        status: 'insights_unavailable', contract_version: MEETING_INSIGHTS_VERSION, meeting_id,
        reason: INSIGHTS_REFUSALS.insights_unavailable, overview_ar: '', overview_en: '', sections: [],
        ai_generated: true, advisory: true, writes_performed: 0,
      });
    }

    const parsed = llmRaw && typeof llmRaw === 'object' && llmRaw.sections ? llmRaw : (typeof llmRaw === 'string' ? safeParse(llmRaw) : null);
    const summary = parsePackSummary(parsed || {});

    const now = new Date().toISOString();
    try {
      await sr.entities.AIOutputLedger.create({
        organization_id: meeting.organization_id || allowed.committee?.organization_id || null,
        output_type: 'meeting_pack_summary',
        source_entity_type: 'MeetingPack',
        source_entity_id: pack.id,
        source_title: pack.title_ar || pack.title || null,
        committee_id: meeting.committee_id,
        model_used: 'automatic',
        prompt_summary: 'ملخص حزمة اجتماع للجهات الإشرافية (استشاري بحت)',
        output_summary: `${summary.sections.length} قسم · ${summary.overview_ar ? 'بنظرة عامة' : 'بلا نظرة عامة'}`,
        structured_content: JSON.stringify(summary),
        generated_at: now,
        generated_by_user_id: allowed.actor?.id || null,
        generated_by_name: allowed.actor?.name || null,
        human_reviewed: false,
        status: 'generated',
        confidence_score: typeof llmRaw?.confidence_score === 'number' ? llmRaw.confidence_score : null,
        confidence_basis: llmRaw?.confidence_basis ? String(llmRaw.confidence_basis) : null,
      });
    } catch (_e) { /* التسجيل لا يوقف */ }

    return Response.json({
      status: 'ok', contract_version: MEETING_INSIGHTS_VERSION, meeting_id,
      pack_id: pack.id, pack_version: pack.version_number || 1,
      ...summary,
      advisory: true, ai_generated: true, generated_at: now, model_used: 'automatic',
      advisory_note: {
        ar: 'هذا الملخص استشاري بحت: لا يُستبدل قراءة الحزمة ولا يُعتمد كمحضر. يُقرأ للجهات الإشرافية، وكل مخرج موسوم «مولَّد آليًا» ومُسجَّل.',
        en: 'This summary is advisory only: it does not replace reading the pack and is not approved as minutes. It is read by oversight bodies, and every output is labelled AI-generated and recorded.',
      },
      writes_performed: 1,
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: MEETING_INSIGHTS_VERSION }, { status: 500 });
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }