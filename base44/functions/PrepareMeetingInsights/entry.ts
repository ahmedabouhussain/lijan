import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolvePrincipal, authorizeRead, refusalBody, refusalStatus } from '../../shared/governedReadPolicy.ts';
import {
  MEETING_INSIGHTS_VERSION, INSIGHTS_REFUSALS,
  buildPrepPrompt, PREP_SCHEMA, parsePrepInsights, hasAgendaContent,
} from '../../shared/meetingInsights.ts';

// PrepareMeetingInsights — التحضير الذكي للاجتماع (قراءة محكومة، استشاري بحت).
// لكل بند أجندة: أسئلة محتملة + تناقضات. وبين البنود: تناقضات وفروقات عن آخر حزمة.

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

    const [agendaRows, lastPacks] = await Promise.all([
      sr.entities.AgendaItem.filter({ meeting_id }).catch(() => ({ items: [] })),
      sr.entities.MeetingPack.filter({ meeting_id, status: 'published' }, { sort: '-published_at', limit: 1 }).catch(() => ({ items: [] })),
    ]);
    const agendaItems = asArray(agendaRows);
    const lastPack = asArray(lastPacks)[0] || null;

    if (!hasAgendaContent(agendaItems)) {
      return Response.json({
        status: 'not_evaluated', contract_version: MEETING_INSIGHTS_VERSION, meeting_id,
        reason: INSIGHTS_REFUSALS.no_agenda, items: [], ai_generated: true, advisory: true, writes_performed: 0,
      });
    }

    const lastPackNote = lastPack ? `آخر حزمة منشورة: «${lastPack.title_ar || lastPack.title || ''}» (الإصدار ${lastPack.version_number || 1})` : null;
    const prompt = buildPrepPrompt(meeting, agendaItems, lastPackNote);

    let llmRaw;
    try {
      llmRaw = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: PREP_SCHEMA });
    } catch (_e) {
      return Response.json({
        status: 'insights_unavailable', contract_version: MEETING_INSIGHTS_VERSION, meeting_id,
        reason: INSIGHTS_REFUSALS.insights_unavailable, items: [], ai_generated: true, advisory: true, writes_performed: 0,
      });
    }

    const parsed = llmRaw && typeof llmRaw === 'object' && Array.isArray(llmRaw.items) ? llmRaw : (typeof llmRaw === 'string' ? safeParse(llmRaw) : null);
    const { items, cross_item_inconsistencies, deltas_from_last, dropped } = parsePrepInsights(parsed || { items: [] });

    const now = new Date().toISOString();
    try {
      await sr.entities.AIOutputLedger.create({
        organization_id: meeting.organization_id || allowed.committee?.organization_id || null,
        output_type: 'meeting_prep_insights',
        source_entity_type: 'Meeting',
        source_entity_id: meeting.id,
        source_title: meeting.title_ar || meeting.title || null,
        committee_id: meeting.committee_id,
        model_used: 'automatic',
        prompt_summary: 'تحضير ذكي للاجتماع: أسئلة محتملة وتناقضات لكل بند (استشاري بحت)',
        output_summary: `${items.length} بند مُحضَّر · ${cross_item_inconsistencies.length} تناقض بين البنود · ${deltas_from_last.length} فروق عن آخر حزمة`,
        structured_content: JSON.stringify({ items, cross_item_inconsistencies, deltas_from_last, dropped }),
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
      items, cross_item_inconsistencies, deltas_from_last, dropped,
      advisory: true, ai_generated: true, generated_at: now, model_used: 'automatic',
      advisory_note: {
        ar: 'هذا التحضير استشاري بحت: لا يُغيّر حالة الاجتماع ولا يُقفل بندًا. يُقرأ قبل الاجتماع، وكل مخرج موسوم «مولَّد آليًا» ومُسجَّل.',
        en: 'This prep is advisory only: it changes no meeting state and closes no item. It is read before the meeting, and every output is labelled AI-generated and recorded.',
      },
      writes_performed: 1,
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: MEETING_INSIGHTS_VERSION }, { status: 500 });
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }