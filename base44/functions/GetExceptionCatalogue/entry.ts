import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  EXCEPTIONS, EXCEPTION_CLASSES, EXCEPTION_RESOLUTIONS, DECLARED_GAPS, DERIVED_SOURCES,
  EXCEPTION_CATALOGUE_VERSION, catalogueSummary, auditCatalogue,
} from '../../shared/exceptionCatalogue.ts';

// GetExceptionCatalogue — المادة و: قراءة سجل الاستثناءات بحقّ القراءة نفسه.
//
// WHY A PERSON READS THIS. When a governed act refuses, the two questions are «ما الذي مُنع؟» and «مَن
// يحلّه؟» — and the third, the one that keeps a refusal honest: «ما لا يجوز استنتاجه وهو قائم؟». This
// read answers all three from ONE register instead of leaving each refusal explained only inside the
// contract that raised it.
//
// It reads under the same right as any committee record (`read` over the committee), because the register
// says nothing a committee member may not see about their own institution's engine. It writes nothing and
// decides nothing: it is a declaration, and the resolution stays with the owner, the policy record or the
// seated actor it names.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};

    const auth = await authorizeCommand(base44, {
      capability: 'read',
      target_type: 'Committee',
      target_id: typeof body.committee_id === 'string' ? body.committee_id : '',
    });
    if (!auth.allowed) return refusalResponse(auth);

    const audit = auditCatalogue();

    // Resolved text travels with the declaration, so the surface renders the register's own wording and
    // never re-writes it. An unknown code is answered as unknown, never with a default.
    const entries = EXCEPTIONS.map((e: any) => ({
      code: e.code,
      class: e.class,
      class_text: EXCEPTION_CLASSES[e.class] || null,
      contract: e.contract,
      emitted_by: e.emitted_by,
      stops: e.stops,
      resolution: e.resolution,
      resolution_text: EXCEPTION_RESOLUTIONS[e.resolution] || null,
      basis: e.basis,
      ar: e.ar, en: e.en,
      never_assume_ar: e.never_assume_ar,
      never_assume_en: e.never_assume_en,
    }));

    const byClass: Record<string, any[]> = {};
    for (const e of entries) (byClass[e.class] = byClass[e.class] || []).push(e);

    return Response.json({
      status: 'ok',
      contract_version: EXCEPTION_CATALOGUE_VERSION,
      entries,
      classes: Object.entries(EXCEPTION_CLASSES).map(([key, text]: any) => ({ key, text, count: (byClass[key] || []).length })),
      resolutions: Object.entries(EXCEPTION_RESOLUTIONS).map(([key, text]: any) => ({ key, text })),
      summary: catalogueSummary(),
      contract_check: audit,
      derived_sources: DERIVED_SOURCES.map((s: any) => ({ module: s.module, version: s.version, map: s.map, codes: s.codes.length })),
      declared_gaps: DECLARED_GAPS,
      writes_performed: 0,
      note_ar: audit.note_ar,
      note_en: audit.note_en,
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: EXCEPTION_CATALOGUE_VERSION }, { status: 500 });
  }
}