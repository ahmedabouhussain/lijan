import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// GenerateProduct — generates a structured governance product from a template.
// Uses InvokeLLM to produce structured JSON sections (no HTML/Markdown).
// Creates a ProductInstance record with source-grounded content.

const PRODUCT_PROMPTS = {
  meeting_minutes: `أنشئ محضر اجتماع رسمي بصيغة JSON منظمة. أقسام: opening, attendance, agenda_items, decisions, actions, closing. كل قسم يحتوي على title_ar, title_en, content_ar, content_en, source_references.`,
  decision_document: `أنشئ وثيقة قرار رسمية بصيغة JSON منظمة. أقسام: preamble, legal_basis, resolution_text, voting_results, execution_plan, dissent. كل قسم يحتوي على title_ar, title_en, content_ar, content_en.`,
  committee_charter: `أنشئ ميثاق لجنة رسمي بصيغة JSON منظمة. أقسام: establishment, mandate, composition, governance_rules, meeting_procedures, voting_rules, term. كل قسم يحتوي على title_ar, title_en, content_ar, content_en.`,
  annual_report: `أنشئ تقرير سنوي رسمي بصيغة JSON منظمة. أقسام: executive_summary, achievements, challenges, financial_overview, recommendations, next_steps. كل قسم يحتوي على title_ar, title_en, content_ar, content_en.`,
  action_report: `أنشئ تقرير إجراءات بصيغة JSON منظمة. أقسام: summary, completed_actions, in_progress, overdue, blockers, recommendations. كل قسم يحتوي على title_ar, title_en, content_ar, content_en.`,
  executive_summary: `أنشئ ملخص تنفيذي بصيغة JSON منظمة. أقسام: overview, key_decisions, critical_actions, risks, recommendations. كل قسم يحتوي على title_ar, title_en, content_ar, content_en.`,
  default: `أنشئ منتج حوكمة رسمي بصيغة JSON منظمة. أقسام: overview, details, recommendations. كل قسم يحتوي على title_ar, title_en, content_ar, content_en.`,
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { product_type, source_entity_type, source_entity_id, committee_id, organization_id, title, export_format } = body;

    if (!product_type || !organization_id) {
      return Response.json({ error: 'product_type and organization_id are required' }, { status: 400 });
    }

    // Resolve authority. A failure to resolve is NOT a permission: this call used to fall back to
    // "allowed" when the guard could not answer, which is exactly the fail-open the policy forbids.
    const authCommittee = committee_id
      ? await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null)
      : null;
    // Authority on a TRUSTED target: the produced record is anchored to the committee RECORD, which
    // the guard loads itself — no scope arrives from the request.
    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committee_id,
      mode: 'create',
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) {
      return Response.json({ error: auth.reason || 'Forbidden', code: auth.code || null }, { status: auth.status || 403 });
    }

    // 1. Look up template: org-specific first, then platform default
    let template = null;
    try {
      const orgTemplates = await base44.asServiceRole.entities.ProductTemplate.filter({
        organization_id, product_type, enabled: true,
      });
      template = (orgTemplates || [])[0];
    } catch {}
    if (!template) {
      try {
        const platformTemplates = await base44.asServiceRole.entities.ProductTemplate.filter({
          organization_id: null, product_type, enabled: true,
        });
        template = (platformTemplates || [])[0];
      } catch {}
    }

    // 2. Gather source data
    let sourceData = {};
    let sourceTitle = title || '';
    if (source_entity_type && source_entity_id) {
      try {
        const entityApi = base44.asServiceRole.entities[source_entity_type];
        if (entityApi) {
          sourceData = await entityApi.get(source_entity_id);
          sourceTitle = sourceTitle || sourceData?.title || sourceData?.name_ar || sourceData?.name_en || '';
        }
      } catch {}
    }

    // Also gather committee context
    let committeeContext = {};
    if (committee_id) {
      try {
        committeeContext = await base44.asServiceRole.entities.Committee.get(committee_id);
      } catch {}
    }

    // 3. Generate structured content via LLM
    const promptKey = PRODUCT_PROMPTS[product_type] ? product_type : 'default';
    const prompt = `${PRODUCT_PROMPTS[promptKey]}

بيانات المصدر:
${JSON.stringify(sourceData, null, 2).substring(0, 3000)}

سياق اللجنة:
${committeeContext.name_ar || committeeContext.name_en || '—'}
الصلاحية: ${committeeContext.mandate || '—'}

أعد JSON يحتوي على مصفوفة "sections"، كل عنصر:
- section_key: مفتاح القسم
- title_ar: عنوان عربي
- title_en: عنوان إنجليزي
- content_ar: محتوى عربي نقي (بدون HTML أو Markdown)
- content_en: محتوى إنجليزي
- source_references: مصفوفة مراجع المصدر [{record_type, record_id}]
- confidence: رقم بين 0 و 1

لا تستخدم HTML أو Markdown. نص عربي نقي فقط.`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                section_key: { type: 'string' },
                title_ar: { type: 'string' },
                title_en: { type: 'string' },
                content_ar: { type: 'string' },
                content_en: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
          },
        },
      },
    });

    const sections = (llmResponse.sections || []).map((s) => ({
      ...s,
      source_references: source_entity_id ? [{ record_type: source_entity_type, record_id: source_entity_id }] : [],
      confidence: typeof s.confidence === 'number' ? s.confidence : 0.5,
    }));

    // 4. Create ProductInstance
    const instance = await base44.asServiceRole.entities.ProductInstance.create({
      organization_id,
      committee_id: committee_id || null,
      product_template_id: template?.id || null,
      product_type,
      title: sourceTitle || `${product_type}`,
      title_ar: sourceTitle,
      source_entity_type: source_entity_type || null,
      source_entity_id: source_entity_id || null,
      source_title: sourceTitle,
      generated_content: JSON.stringify(sections),
      export_format: export_format || template?.default_format || 'pdf',
      classification: template?.classification_default || 'internal',
      status: 'generated',
      generated_by_user_id: auth.user?.id || null,
      generated_by_name: auth.user?.full_name || auth.user?.email || 'System',
      generated_at: new Date().toISOString(),
      ai_model_used: 'automatic',
      ai_confidence: sections.length > 0 ? sections.reduce((sum, s) => sum + (s.confidence || 0), 0) / sections.length : 0,
      human_edited: false,
      correlation_id: auth.correlation_id || null,
    });

    // 5. Audit
    try {
      await base44.asServiceRole.entities.AuditEvent.create({
        organization_id,
        committee_id: committee_id || null,
        actor_user_id: auth.user?.id || null,
        actor_name: auth.user?.full_name || auth.user?.email || 'System',
        action: 'create',
        entity_type: 'ProductInstance',
        entity_id: instance.id,
        description: `Generated ${product_type} product`,
        correlation_id: auth.correlation_id || null,
      });
    } catch {}

    return Response.json({
      status: 'ok',
      instance_id: instance.id,
      sections,
      title: sourceTitle,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}