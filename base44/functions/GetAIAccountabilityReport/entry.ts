import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  AI_ACCOUNTABILITY_VERSION, AI_DISCLOSURE_FLOOR, AI_OUTPUT_TYPES, FEEDBACK_RATINGS,
  AI_METRICS, assessAIMetric, selfCheckAI, ADVISORY_ONLY_CLAUSE,
} from '../../shared/aiAccountability.ts';

// GetAIAccountabilityReport — تقرير المساءلة على الذكاء محسوبًا خادميًا (ai-accountability-1.0.0).
//
// يحوّل سجل مخرجات الذكاء إلى مقاييس إفصاح وطنية: تغطية المراجعة البشرية، معدل تجاوز الإنسان،
// نسبة المفيد، ومتوسط الثقة — كلها محسوبة على الخادم عبر count وaggregate، لا من صفحة محمّلة.
// يحترم أرضية الإفصاح (لا نسبة تحت ٥)، ويُعلن المصادر غير المقروءة، ولا يدّعي امتثالاً بلا دليل.
// السلطة: قراءة على اللجنة (authorizeCommand). لا يكتب شيئًا.

const asArray = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const { committee_id } = body;
    if (!committee_id) return Response.json({ error: 'committee_id is required', code: 'missing_committee' }, { status: 400 });

    // السلطة: قراءة على اللجنة — لا يُكشف أداء الذكاء لمن لا يقرأ اللجنة.
    const auth = await authorizeCommand(base44, { capability: 'read', target_type: 'Committee', target_id: committee_id });
    if (!auth.allowed) return refusalResponse(auth);

    const committeeId = auth.trusted_target?.derived_committee_id || committee_id;
    const unread: any[] = [];

    const safeCount = async (query: any, label: string) => {
      try { const n = await sr.entities.AIOutputLedger.count(query); return typeof n === 'number' ? n : null; }
      catch (e) { unread.push({ source: label, reason: (e as Error)?.message || 'read failed' }); return null; }
    };
    const safeAggregate = async (opts: any, label: string) => {
      try { return await sr.entities.AIOutputLedger.aggregate(opts); }
      catch (e) { unread.push({ source: label, reason: (e as Error)?.message || 'read failed' }); return null; }
    };

    // مقاييس النسب — count محض
    const total = await safeCount({ committee_id: committeeId }, 'AIOutputLedger (total)');
    const reviewed = await safeCount({ committee_id: committeeId, human_reviewed: true }, 'AIOutputLedger (reviewed)');
    const helpfulCount = await safeCount({ committee_id: committeeId, feedback_rating: 'helpful' }, 'AIOutputLedger (helpful)');
    const needsCorrectionCount = await safeCount({ committee_id: committeeId, feedback_rating: 'needs_correction' }, 'AIOutputLedger (needs_correction)');
    const notHelpfulCount = await safeCount({ committee_id: committeeId, feedback_rating: 'not_helpful' }, 'AIOutputLedger (not_helpful)');

    const overrideCount = (needsCorrectionCount ?? 0) + (notHelpfulCount ?? 0);
    const overrideDenom = reviewed;

    const metrics = [
      assessAIMetric('ai_review_coverage', reviewed, total),
      assessAIMetric('ai_human_override_rate', (needsCorrectionCount === null || notHelpfulCount === null) ? null : overrideCount, overrideDenom),
      assessAIMetric('ai_helpful_rate', helpfulCount, reviewed),
    ];

    // متوسط الثقة — aggregate avg
    let confidenceAvg = null;
    let confidenceCount = null;
    const confAgg = await safeAggregate({ query: { committee_id: committeeId, confidence_score: { $exists: true } }, avg: 'confidence_score' }, 'AIOutputLedger (avg confidence)');
    const confRows = confAgg?.rows ? asArray(confAgg.rows) : asArray(confAgg);
    if (confRows.length && confRows[0]) {
      confidenceAvg = typeof confRows[0].avg_confidence_score === 'number' ? confRows[0].avg_confidence_score : null;
      confidenceCount = typeof confRows[0].count === 'number' ? confRows[0].count : null;
    }
    // assessAIMetric للثقة: البسط = مجموع الدرجات (avg*count)، المقام = العدد
    const confidenceSum = (confidenceAvg !== null && confidenceCount !== null) ? Math.round(confidenceAvg * confidenceCount) : null;
    metrics.push(assessAIMetric('ai_confidence_avg', confidenceSum, confidenceCount));

    // التوزيع حسب النوع — aggregate groupBy
    const typeAgg = await safeAggregate({ query: { committee_id: committeeId }, groupBy: 'output_type' }, 'AIOutputLedger (by type)');
    const byType = asArray(typeAgg?.rows || typeAgg || []).map((r: any) => ({
      type: r.output_type || r._id || 'other',
      count: r.count || 0,
      label: AI_OUTPUT_TYPES[r.output_type || r._id] || AI_OUTPUT_TYPES.other,
    })).filter((r) => r.count > 0);

    // الالتزام بـ«الاستشاري فقط» — كل نوع معلن استشاري
    const advisoryOnlyOk = Object.values(AI_OUTPUT_TYPES).every((t: any) => t.advisory === true);

    const summary = {
      total_outputs: total,
      reviewed_outputs: reviewed,
      review_coverage_state: metrics[0].state,
      override_rate_state: metrics[1].state,
      advisory_only_compliance: advisoryOnlyOk,
      types_in_use: byType.length,
    };

    return Response.json({
      status: 'ok',
      contract_version: AI_ACCOUNTABILITY_VERSION,
      generated_at: new Date().toISOString(),
      committee_id: committeeId,
      committee_name: { ar: auth.target?.name_ar || auth.target?.name || null, en: auth.target?.name_en || auth.target?.name || null },
      authority: { capability: 'read', effective_role: auth.effective_role, policy_version: auth.policy_version },
      disclosure_floor: AI_DISCLOSURE_FLOOR,
      metrics,
      feedback_distribution: {
        helpful: helpfulCount,
        needs_correction: needsCorrectionCount,
        not_helpful: notHelpfulCount,
        total_reviewed: reviewed,
      },
      feedback_labels: FEEDBACK_RATINGS,
      by_output_type: byType,
      advisory_only: {
        compliant: advisoryOnlyOk,
        clause: ADVISORY_ONLY_CLAUSE,
        types_declared: Object.keys(AI_OUTPUT_TYPES).length,
      },
      summary,
      unread_sources: unread,
      counts_performed: 6,
      aggregations_performed: 2,
      registry_self_check: selfCheckAI(),
      honesty_note: {
        ar: 'هذا التقرير إفصاح محسوب خادميًا من سجل مخرجات الذكاء. ما هو تحت أرضية الإفصاح (٥) يُكتم ولا يُعرض كنسبة. لا يدّعي هذا التقرير «دقة» الذكاء بل يفصح عن أدائه ازاء المراجع البشري — والحكم النهائي بشري.',
        en: 'This report is server-computed from the AI output ledger. Anything below the disclosure floor (5) is withheld, never shown as a rate. It does not claim AI "accuracy" — it discloses the AI performance against the human reviewer, and the final verdict is human.',
      },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message, contract_version: AI_ACCOUNTABILITY_VERSION }, { status: 500 });
  }
}