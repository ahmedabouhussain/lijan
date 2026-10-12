import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  AI_SYSTEM_REGISTRY_VERSION, AI_RISK_TIERS, PERMITTED_USE_CASES, AI_SYSTEM_STATUS,
} from '../../shared/aiSystemRegistry.ts';

// GetPublicAIRegister — السجل العمومي الوطني للذكاء الاصطناعي (إفصاح بلا تسجيل دخول).
//
// يعيد الأنظمة المُعتمدة (قيد الاستخدام) والمُحالة (تُحفظ لأن مخرجاتها تبقى) — لا المسودات
// ولا قيد المراجعة. يُفصح عن: الهوية، الغرض، فئة المخاطر ومرجعها المعياري، حالات الاستخدام
// المصرّح بها (كلها استشارية)، مصادر البيانات، تقييم الأثر (المتأثرون · المخاطر · التدابير)،
// أساس الإشراف البشري، الجهة المالكة. لا يكشف معرّفات داخلية ولا هويات المراجعين.
//
// المرجع المعياري: EU AI Act Art. 60 (public database) · Canada Directive on Automated
// Decision-Making (Algorithmic Impact Assessment — public disclosure) · Dutch Algorithm Register.
//
// لا يتطلب تسجيل دخول — الإفصاح العمومي التزام وطني، لا امتياز.

const asArray = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // الأنظمة المُعتمدة والمُحالة فقط — المسودة وقيد المراجعة ليستا للتعميم.
    const systemsRes = await sr.entities.AISystem.filter(
      { status: { $in: ['approved', 'retired'] } },
      {
        sort: '-deployed_at', limit: 200,
        fields: [
          'organization_id', 'committee_id', 'system_name', 'system_name_en',
          'purpose', 'purpose_en', 'risk_tier', 'approved_use_cases', 'data_sources',
          'human_oversight_required', 'human_oversight_basis', 'affected_parties',
          'identified_risks', 'mitigation_measures', 'standard_reference', 'status',
          'deployed_at', 'retired_at', 'retired_reason',
        ],
      }
    );
    const systems = asArray(systemsRes);

    // حلّ أسماء الجهات واللجان دفعة واحدة
    const orgIds = [...new Set(systems.map((s: any) => s.organization_id).filter(Boolean))];
    const committeeIds = [...new Set(systems.map((s: any) => s.committee_id).filter(Boolean))];
    const [orgsRes, committeesRes] = await Promise.allSettled([
      orgIds.length ? sr.entities.Organization.filter({ id: { $in: orgIds } }, { fields: ['id', 'name_ar', 'name_en'] }) : Promise.resolve([]),
      committeeIds.length ? sr.entities.Committee.filter({ id: { $in: committeeIds } }, { fields: ['id', 'name_ar', 'name_en'] }) : Promise.resolve([]),
    ]);
    const orgs = orgsRes.status === 'fulfilled' ? asArray(orgsRes.value) : [];
    const committees = committeesRes.status === 'fulfilled' ? asArray(committeesRes.value) : [];
    const orgMap = Object.fromEntries(orgs.map((o: any) => [o.id, o]));
    const committeeMap = Object.fromEntries(committees.map((c: any) => [c.id, c]));

    const publicSystems = systems.map((s: any) => {
      const tier = AI_RISK_TIERS[s.risk_tier] || null;
      const org = orgMap[s.organization_id] || null;
      const committee = committeeMap[s.committee_id] || null;
      return {
        system_name: s.system_name,
        system_name_en: s.system_name_en,
        purpose: s.purpose,
        purpose_en: s.purpose_en,
        risk_tier: s.risk_tier,
        risk_tier_label: tier ? { ar: tier.ar, en: tier.en } : null,
        risk_tier_standard: tier?.standard || null,
        approved_use_cases: (s.approved_use_cases || []).map(
          (k: string) => PERMITTED_USE_CASES[k] ? { key: k, ar: PERMITTED_USE_CASES[k].ar, en: PERMITTED_USE_CASES[k].en } : { key: k, ar: k, en: k }
        ),
        data_sources: s.data_sources || [],
        human_oversight_required: s.human_oversight_required !== false,
        human_oversight_basis: s.human_oversight_basis || null,
        impact_assessment: {
          affected_parties: s.affected_parties || null,
          identified_risks: s.identified_risks || null,
          mitigation_measures: s.mitigation_measures || null,
        },
        standard_reference: s.standard_reference || tier?.standard || null,
        status: s.status,
        status_label: AI_SYSTEM_STATUS[s.status] || null,
        deployed_at: s.deployed_at || null,
        retired_at: s.retired_at || null,
        retired_reason: s.retired_reason || null,
        organization: org ? { name_ar: org.name_ar, name_en: org.name_en } : null,
        committee: committee ? { name_ar: committee.name_ar, name_en: committee.name_en } : null,
      };
    });

    // ملخص وطني — إحصاءات آمنة للتعميم
    const admissibleTiers = Object.entries(AI_RISK_TIERS).filter(([, t]) => t.admissible);
    const by_risk_tier = admissibleTiers.map(([key, t]) => ({
      key,
      label: { ar: t.ar, en: t.en },
      count: publicSystems.filter((s) => s.risk_tier === key).length,
    }));

    return Response.json({
      status: 'ok',
      contract_version: AI_SYSTEM_REGISTRY_VERSION,
      generated_at: new Date().toISOString(),
      summary: {
        total_systems: publicSystems.length,
        approved_count: publicSystems.filter((s) => s.status === 'approved').length,
        retired_count: publicSystems.filter((s) => s.status === 'retired').length,
        by_risk_tier,
        advisory_only: true, // التزام المنصة — كل حالة استخدام استشارية بحتة
        all_have_oversight: publicSystems.every((s) => s.human_oversight_required),
      },
      systems: publicSystems,
      honesty_note: {
        ar: 'هذا السجل إفصاح عمومي عن أنظمة الذكاء المُعتمدة قيد الاستخدام. لا يشمل المسودات ولا الأنظمة قيد المراجعة. كل نظام استشاري لا يُغيّر حالة الحوكمة — الحكم النهائي بشري.',
        en: 'This register publicly discloses approved AI systems in use. It excludes drafts and systems under review. Every system is advisory only — it does not change governance state, and the final verdict is human.',
      },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message, contract_version: AI_SYSTEM_REGISTRY_VERSION }, { status: 500 });
  }
}