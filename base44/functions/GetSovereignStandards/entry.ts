import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  SOVEREIGN_STANDARDS, SOVEREIGN_STANDARDS_VERSION, STATUS_LABELS, EVIDENCE_KIND_LABELS,
  auditStandards, standardsSummary,
} from '../../shared/sovereignStandards.ts';

// GetSovereignStandards — سجل المعايير السيادية: الإثبات الذي يطلبه مراجعو الحوكمة الوطنيون.
//
// قراءة محكومة على مستوى المنصة (لا تحتاج نطاق لجنة): أي مستخدم مصدّق يقرأ الإعلان.
// تُعيد الإعلان الكامل + الفحص الذاتي + الملخصات. لا تكتب شيئًا.
// ما لا تفعله: لا تُصدر شهادة خارجية، لا تدّعي امتثالاً بلا دليل، ولا تحلّ محل تدقيق مستقل.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const audit = auditStandards();
    const summary = standardsSummary();

    const standards = SOVEREIGN_STANDARDS.map((std) => ({
      id: std.id,
      standard_key: std.standard_key,
      name_ar: std.name_ar,
      name_en: std.name_en,
      issuing_body_ar: std.issuing_body_ar,
      issuing_body_en: std.issuing_body_en,
      reference_url: std.reference_url || null,
      summary_ar: std.summary_ar,
      summary_en: std.summary_en,
      controls: std.controls.map((c) => ({
        id: c.id,
        clause: c.clause,
        ar: c.ar,
        en: c.en,
        what_platform_does_ar: c.what_platform_does_ar,
        what_platform_does_en: c.what_platform_does_en,
        evidence: c.evidence,
        evidence_kind: c.evidence_kind,
        evidence_kind_label: EVIDENCE_KIND_LABELS[c.evidence_kind] || null,
        owning_authority_ar: c.owning_authority_ar,
        owning_authority_en: c.owning_authority_en,
        status: c.status,
        status_label: STATUS_LABELS[c.status] || null,
        declared_limit_ar: c.declared_limit_ar || null,
        declared_limit_en: c.declared_limit_en || null,
      })),
    }));

    return Response.json({
      status: 'ok',
      contract_version: SOVEREIGN_STANDARDS_VERSION,
      generated_at: new Date().toISOString(),
      reader: user ? { id: user.id, role: user.role || null } : null,
      standards,
      summary,
      registry_audit: audit,
      honesty_note: {
        ar: 'هذا السجل إعلان المنصة عن نفسها ازاء معايير دولية معلنة. ما هو «جزئي» أو «مخطّط» يُعلن حدّه صراحةً ولا يُدَّعى امتثالاً. لا يُصدر شهادة خارجية ولا يحلّ محل تدقيق مستقل — وهو يُحدَّث عند كل تطور في العقود أو الكيانات أو الأسطح.',
        en: 'This register is the platform declaring itself against published international standards. What is "partial" or "planned" states its limit explicitly and is never claimed as adherence. It issues no external certification and replaces no independent audit — it is updated whenever a contract, entity, or surface evolves.',
      },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message, contract_version: SOVEREIGN_STANDARDS_VERSION }, { status: 500 });
  }
}