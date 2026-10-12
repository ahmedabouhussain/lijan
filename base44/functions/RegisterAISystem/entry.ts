import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { AI_SYSTEM_REGISTRY_VERSION, AI_RISK_TIERS, PERMITTED_USE_CASES, PROHIBITED_USE_CASES } from '../../shared/aiSystemRegistry.ts';

// RegisterAISystem — يُسجّل نظام ذكاء اصطناعي قيد الاستخدام مع تقييم أثره.
// ISO/IEC 42001 §6.1.2 (تقييم مخاطر الذكاء) + §8.3 (تقييم أثر نظام الذكاء) + EU AI Act (تصنيف المخاطر).
// لا يُقبل نظام ممنوع (prohibited) ولا حالة استخدام غير استشارية. السلطة: مدير فقط.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Only platform admins may register AI systems', code: 'admin_only' }, { status: 403 });

    const body = await req.json().catch(() => ({})) || {};
    const {
      organization_id, committee_id, system_name, system_name_en,
      purpose, purpose_en, model_used, risk_tier,
      approved_use_cases = [], data_sources = [],
      affected_parties, identified_risks, mitigation_measures, human_oversight_basis,
    } = body;

    // 1. التحقق من الحقول المطلوبة
    if (!organization_id) return Response.json({ error: 'organization_id is required', code: 'missing_org' }, { status: 400 });
    if (!system_name) return Response.json({ error: 'system_name is required', code: 'missing_name' }, { status: 400 });
    if (!purpose) return Response.json({ error: 'purpose is required', code: 'missing_purpose' }, { status: 400 });
    if (!risk_tier) return Response.json({ error: 'risk_tier is required', code: 'missing_tier' }, { status: 400 });

    // 2. فئة المخاطر: لا تُقبل «الممنوع» على هذه المنصة
    if (!AI_RISK_TIERS[risk_tier]) {
      return Response.json({ error: 'Unknown risk tier', code: 'unknown_tier' }, { status: 400 });
    }
    if (!AI_RISK_TIERS[risk_tier].admissible) {
      return Response.json({
        error: 'This risk tier is prohibited on this platform — no AI system of this class may be registered',
        code: 'prohibited_tier',
      }, { status: 400 });
    }

    // 3. حالات الاستخدام: كل واحدة استشارية بحتة
    const invalid = (approved_use_cases || []).filter((k) => !PERMITTED_USE_CASES[k]);
    if (invalid.length > 0) {
      return Response.json({
        error: 'Unapproved use case(s): ' + invalid.join(', '),
        code: 'unapproved_use_case',
        permitted: Object.keys(PERMitted_USE_CASES),
      }, { status: 400 });
    }

    // 4. تقييم الأثر (ISO 42001 §8.3): الأربعة أسئلة جوهرية مطلوبة
    if (!affected_parties || !identified_risks || !mitigation_measures || !human_oversight_basis) {
      return Response.json({
        error: 'Impact assessment incomplete — affected_parties, identified_risks, mitigation_measures and human_oversight_basis are all required',
        code: 'incomplete_impact_assessment',
      }, { status: 400 });
    }

    // 5. بناء تقييم الأثر المُسلسَل (canonical JSON)
    const impact_assessment = JSON.stringify({
      affected_parties,
      identified_risks,
      mitigation_measures,
      human_oversight_basis,
      assessed_by_user_id: user.id,
      assessed_by_name: user.full_name || user.email,
      assessed_at: new Date().toISOString(),
    });

    const standard_reference = `ISO/IEC 42001:2023 §6.1.2 (AI risk assessment) · §8.3 (AI system impact assessment) · EU AI Act (${AI_RISK_TIERS[risk_tier].en})`;

    // 6. الكتابة
    const record = await base44.asServiceRole.entities.AISystem.create({
      organization_id,
      committee_id: committee_id || null,
      system_name,
      system_name_en: system_name_en || null,
      purpose,
      purpose_en: purpose_en || null,
      model_used: model_used || 'automatic',
      risk_tier,
      approved_use_cases: approved_use_cases || [],
      data_sources: data_sources || [],
      human_oversight_required: true,
      impact_assessment,
      affected_parties,
      identified_risks,
      mitigation_measures,
      human_oversight_basis,
      standard_reference,
      status: body.status || 'under_review',
      deployed_at: body.deployed_at || null,
      contract_version: AI_SYSTEM_REGISTRY_VERSION,
      correlation_id: 'aisys_' + Date.now().toString(36),
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id,
      committee_id: committee_id || null,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: 'create',
      entity_type: 'AISystem',
      entity_id: record.id,
      entity_title: system_name,
      description: `AI system registered: ${system_name} (risk tier: ${risk_tier})`,
      correlation_id: 'aisys_audit_' + Date.now().toString(36),
    });

    return Response.json({
      status: 'ok',
      system_id: record.id,
      system_name,
      risk_tier,
      risk_tier_label: { ar: AI_RISK_TIERS[risk_tier].ar, en: AI_RISK_TIERS[risk_tier].en },
      standard_reference,
      contract_version: AI_SYSTEM_REGISTRY_VERSION,
      message: 'AI system registered. It is under review until a competent authority approves it into use.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}