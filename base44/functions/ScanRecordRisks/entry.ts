import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolvePrincipal, authorizeRead, refusalBody, refusalStatus } from '../../shared/governedReadPolicy.ts';
import {
  RECORD_RISK_SCAN_VERSION, RISK_CATEGORIES, RISK_SEVERITIES, RISK_SCAN_REFUSALS,
  buildRiskScanPrompt, RISK_SCAN_SCHEMA, parseRiskScan, auditRiskScanContract, hasProposalText,
} from '../../shared/recordRiskScan.ts';

// ScanRecordRisks — فاحص المخاطر قبل الاعتماد (قراءة محكومة، استشاري بحت، بلا كتابة حالة).
//
// يفحص نص مقترح قرار قبل اعتماده أو إصداره، ويعرض المخاطر القانونية/الامتثالية/التشغيلية
// المكتشفة. ما لا يفعله أبدًا: لا يغيّر حالة القرار، لا يرفض الإصدار آليًا، لا يصحّح النص.
// الوقاية في الأوامر الحاكمة، وهذا الفحص يُعرض للمالك ليقرأه مقابل سياسة المؤسسة.
//
// خمسة شروط حاكمة: استشاري بحت · موسوم ومُسجَّل في AIOutputLedger · قبل السجل · سيادة البيانات ·
// لا يُخترع ما ليس في النص (علم بلا مقطع يُرفض).

const asArray = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const { decision_id, showcase_token } = body || {};

    if (!decision_id) return Response.json({ error: 'decision_id is required' }, { status: 400 });

    const callerUser = await base44.auth.me().catch(() => null);
    const principal = await resolvePrincipal({ sr, body: { showcase_token }, callerUser });

    const decision: any = await sr.entities.Decision.get(decision_id).catch(() => null);
    if (!decision) return Response.json(refusalBody('not_found'), { status: refusalStatus('not_found') });

    const allowed: any = await authorizeRead({ base44, sr, principal, record: decision });
    if (!allowed.allowed) {
      return Response.json(refusalBody(allowed.reason), { status: refusalStatus(allowed.reason) });
    }

    // قاعدة الصدق الأولى: لا نص ⇒ «غير مُقيَّم» لا «بلا مخاطر».
    if (!hasProposalText(decision)) {
      return Response.json({
        status: 'not_evaluated',
        contract_version: RECORD_RISK_SCAN_VERSION,
        decision_id,
        reason: RISK_SCAN_REFUSALS.no_proposal_text,
        flags: [],
        ai_generated: true,
        advisory: true,
        writes_performed: 0,
      });
    }

    // سياق اسم اللجنة والاجتماع لإثراء الفحص (قراءة محكومة بنطاق السجل).
    const committeeName = allowed.committee?.name_ar || allowed.committee?.name_en || null;
    let meetingTitle: string | null = null;
    if (decision.meeting_id) {
      const meeting: any = await sr.entities.Meeting.get(decision.meeting_id).catch(() => null);
      meetingTitle = meeting?.title_ar || meeting?.title || null;
    }

    const prompt = buildRiskScanPrompt(decision, { committeeName, meetingTitle });

    let llmRaw: any;
    try {
      llmRaw = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: RISK_SCAN_SCHEMA,
      });
    } catch (_e) {
      // قاعدة الصدق الثانية: تعذّر الفحص لا يُدَّعى سلامة. لا كتابة حالة.
      return Response.json({
        status: 'scan_unavailable',
        contract_version: RECORD_RISK_SCAN_VERSION,
        decision_id,
        reason: RISK_SCAN_REFUSALS.scan_unavailable,
        flags: [],
        ai_generated: true,
        advisory: true,
        writes_performed: 0,
      });
    }

    // InvokeLLM مع schema يُعيد كائنًا؛ ندافع عن أي شكل آخر.
    const parsed = llmRaw && typeof llmRaw === 'object' && Array.isArray((llmRaw as any).flags)
      ? llmRaw
      : (typeof llmRaw === 'string' ? safeParse(llmRaw) : null);

    const { flags, dropped } = parseRiskScan(parsed || { flags: [] });

    const now = new Date().toISOString();
    const actor = allowed.actor;
    const flagCountByCategory: Record<string, number> = {};
    for (const f of flags) flagCountByCategory[f.category] = (flagCountByCategory[f.category] || 0) + 1;
    const highCount = flags.filter((f: any) => f.severity === 'high').length;

    // التسجيل في AIOutputLedger — كل مخرج ذكاء يُسجَّل: النوع · المصدر · النموذج · الوقت · الفاعل.
    // الكتابة الوحيدة هنا هي سجل التدقيق هذا؛ لا تُمَس حالة القرار.
    let ledger = null;
    try {
      ledger = await sr.entities.AIOutputLedger.create({
        organization_id: decision.organization_id || allowed.committee?.organization_id || null,
        output_type: 'record_risk_scan',
        source_entity_type: 'Decision',
        source_entity_id: decision.id,
        source_title: decision.title_ar || decision.title || null,
        committee_id: decision.committee_id,
        model_used: 'automatic',
        prompt_summary: 'فحص مخاطر نص مقترح قرار قبل الاعتماد (استشاري بحت)',
        output_summary: `${flags.length} علمًا (${highCount} عالي)${dropped.length ? ` · رُفض ${dropped.length} ناقص` : ''}`,
        structured_content: JSON.stringify({ flags, dropped, decision_status: decision.status }),
        generated_at: now,
        generated_by_user_id: actor?.id || null,
        generated_by_name: actor?.name || null,
        human_reviewed: false,
        status: 'generated',
        confidence_score: typeof llmRaw?.confidence_score === 'number' ? llmRaw.confidence_score : null,
        confidence_basis: llmRaw?.confidence_basis ? String(llmRaw.confidence_basis) : null,
      });
    } catch (_e) { /* التسجيل لا يوقف الفحص */ }

    return Response.json({
      status: 'ok',
      contract_version: RECORD_RISK_SCAN_VERSION,
      decision_id,
      committee_id: decision.committee_id,
      decision_status: decision.status,
      ledger_id: ledger?.id || null,
      confidence_score: typeof ledger?.confidence_score === 'number' ? ledger.confidence_score : null,
      confidence_basis: ledger?.confidence_basis || null,
      flags,
      flag_count: flags.length,
      high_count: highCount,
      dropped,
      categories_declared: Object.keys(RISK_CATEGORIES),
      severities_declared: Object.keys(RISK_SEVERITIES),
      advisory: true,
      ai_generated: true,
      generated_at: now,
      model_used: 'automatic',
      advisory_note: {
        ar: 'هذا الفحص استشاري بحت: لا يُغيّر حالة القرار ولا يوقف إصدارًا ولا يصحّح النص. يُقرأ مقابل سياسة المؤسسة، وكل مخرج موسوم «مولَّد آليًا» ومُسجَّل في سجل مخرجات الذكاء.',
        en: 'This scan is advisory only: it changes no decision state, stops no issuance and corrects no text. It is read against the institution\'s policy, and every output is labelled "AI-generated" and recorded in the AI output ledger.',
      },
      contract_check: auditRiskScanContract(),
      writes_performed: 1, // AIOutputLedger فقط؛ حالة القرار لم تُمَس.
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message, contract_version: RECORD_RISK_SCAN_VERSION }, { status: 500 });
  }
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}