import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// GeneratePolicyScenarioAI — server-side AI for policy scenario impact assessment.
// Replaces the unsafe client-side InvokeLLM call in PolicyScenarios.jsx.
// Creates AIOutputLedger entry.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { scenario_id, committee_id } = body;
    if (!scenario_id) return Response.json({ error: 'scenario_id is required' }, { status: 400 });

    const scenario = await base44.asServiceRole.entities.PolicyScenario.get(scenario_id);
    if (!scenario) return Response.json({ error: 'Scenario not found' }, { status: 404 });

    // Resolve organization_id from committee if available
    let orgId = null;
    if (committee_id) {
      const committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
      if (committee) orgId = committee.organization_id;
    }

    const prompt = `أنت محلل سياسات مؤسسي. قيّم السيناريو التالي واقترح الأثر والتكلفة والجدول الزمني والمخاطر بصيغة احترافية:

العنوان: ${scenario.title || scenario.title_ar}
الوصف: ${scenario.description || '—'}
النوع: ${scenario.scenario_type}

أعد النتيجة بصيغة JSON: projected_impact, projected_cost, projected_timeline, risk_assessment`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          projected_impact: { type: 'string' },
          projected_cost: { type: 'string' },
          projected_timeline: { type: 'string' },
          risk_assessment: { type: 'string' },
        },
      },
    });

    // Update scenario with AI assessment
    await base44.asServiceRole.entities.PolicyScenario.update(scenario_id, {
      projected_impact: llmResponse.projected_impact,
      projected_cost: llmResponse.projected_cost,
      projected_timeline: llmResponse.projected_timeline,
      risk_assessment: llmResponse.risk_assessment,
      ai_generated: true,
    });

    // AIOutputLedger
    await base44.asServiceRole.entities.AIOutputLedger.create({
      organization_id: orgId,
      output_type: 'policy_scenario',
      source_entity_type: 'PolicyScenario',
      source_entity_id: scenario_id,
      source_title: scenario.title || scenario.title_ar,
      committee_id: committee_id || null,
      model_used: 'automatic',
      prompt_summary: 'تقييم أثر السيناريو السياسي',
      output_summary: JSON.stringify(llmResponse).substring(0, 500),
      generated_at: new Date().toISOString(),
      generated_by_user_id: user.id,
      generated_by_name: user.full_name || user.email,
      human_reviewed: false,
      status: 'generated',
    });

    return Response.json({ status: 'ok', assessment: llmResponse });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}