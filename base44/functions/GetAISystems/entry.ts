import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { AI_SYSTEM_REGISTRY_VERSION, AI_RISK_TIERS, AI_SYSTEM_STATUS } from '../../shared/aiSystemRegistry.ts';

// GetAISystems — قراءة سجل أنظمة الذكاء الاصطناعي (ISO 42001 / EU AI Act).
// يُرجع الأنظمة داخل نطاق الجهة (أو لجنة محددة)، مع ملصقات ثنائية اللغة لفئة المخاطر والحالة.
// قراءة فقط — لا يُغيّر حالة. السلطة: نطاق الجهة (RLS).

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    const { organization_id, committee_id } = body;

    // نطاق القراءة: الجهة الفاعلة أو مدير المنصة
    const scope = user.role === 'admin' && organization_id
      ? { organization_id }
      : user.role === 'admin'
        ? {}
        : { organization_id: user.data?.active_org_id };

    if (!scope.organization_id && user.role !== 'admin') {
      return Response.json({ error: 'No organization scope for this user', code: 'no_org' }, { status: 403 });
    }

    const query = committee_id
      ? { ...scope, committee_id }
      : scope;

    const res = await base44.asServiceRole.entities.AISystem.filter(query, {
      sort: '-created_date',
      limit: 100,
    });
    const items = (res?.items || res || []).map((s) => ({
      id: s.id,
      system_name: s.system_name,
      system_name_en: s.system_name_en,
      purpose: s.purpose,
      purpose_en: s.purpose_en,
      model_used: s.model_used,
      risk_tier: s.risk_tier,
      risk_tier_label: AI_RISK_TIERS[s.risk_tier]
        ? { ar: AI_RISK_TIERS[s.risk_tier].ar, en: AI_RISK_TIERS[s.risk_tier].en, tone: AI_RISK_TIERS[s.risk_tier].tone, standard: AI_RISK_TIERS[s.risk_tier].standard }
        : null,
      approved_use_cases: s.approved_use_cases || [],
      data_sources: s.data_sources || [],
      human_oversight_required: s.human_oversight_required !== false,
      affected_parties: s.affected_parties,
      identified_risks: s.identified_risks,
      mitigation_measures: s.mitigation_measures,
      human_oversight_basis: s.human_oversight_basis,
      standard_reference: s.standard_reference,
      status: s.status,
      status_label: AI_SYSTEM_STATUS[s.status]
        ? { ar: AI_SYSTEM_STATUS[s.status].ar, en: AI_SYSTEM_STATUS[s.status].en, tone: AI_SYSTEM_STATUS[s.status].tone }
        : null,
      approved_by_name: s.approved_by_name || null,
      approved_at: s.approved_at || null,
      deployed_at: s.deployed_at || null,
      created_date: s.created_date,
    }));

    return Response.json({
      status: 'ok',
      contract_version: AI_SYSTEM_REGISTRY_VERSION,
      count: items.length,
      systems: items,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}