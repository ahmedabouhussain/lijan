import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { auditStandards, SOVEREIGN_STANDARDS, SOVEREIGN_STANDARDS_VERSION } from '../../shared/sovereignStandards.ts';

// TestSovereignStandards — فحص ذاتي لسجل المعايير السيادية (لا يحتاج مصادقة).
// يتحقق أن: كل بند له دليل، كل بند جزئي/مخطّط له حدّ مُعلن، ولا عيب خفي.

export default async function (req) {
  try {
    const _base44 = createClientFromRequest(req);
    const audit = auditStandards();

    const errors: string[] = [];
    if (SOVEREIGN_STANDARDS.length < 5) errors.push('too_few_standards');
    if (audit.findings.length) errors.push(...audit.findings);

    // كل معيار له بنود وكل بند له جهة مالكة ودليل
    for (const std of SOVEREIGN_STANDARDS) {
      if (!std.controls.length) errors.push(`no_controls:${std.id}`);
    }

    return Response.json({
      status: errors.length ? 'fail' : 'ok',
      contract_version: SOVEREIGN_STANDARDS_VERSION,
      standards_count: SOVEREIGN_STANDARDS.length,
      controls_count: audit.counts.controls,
      audit,
      errors,
      message: errors.length
        ? `${errors.length} finding(s): ${errors.join(', ')}`
        : 'All controls carry evidence and owning authority; partial/planned controls declare their limits.',
    });
  } catch (error) {
    return Response.json({ status: 'fail', error: (error as Error).message }, { status: 500 });
  }
}