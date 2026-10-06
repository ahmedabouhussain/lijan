import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  GOVERNANCE_SURFACES, GOVERNANCE_SURFACES_VERSION, SURFACE_STAGES, UNAVAILABLE_CLASSES,
  ACTOR_BINDINGS, EVIDENCE_STATUSES, summarizeRegistry, auditRegistry, surfacesByStage, declaredCapabilities,
} from '../../shared/governanceSurfaceRegistry.ts';

// GetGovernanceSurfaces — G-1: the register of governed surfaces, read under authority.
//
// Governed read: the `read` right over the committee itself. It returns the DECLARATION — which
// capability governs each surface, which command performs it, which contract gates its state, what the
// surface shows when the act is unavailable, and what evidence exists for it — plus the registry's own
// self-check, its counts, and the capabilities it declares.
//
// It deliberately does NOT decide availability per surface: that belongs to the authority kernel, and
// the surface asks `GetCommitteeCapabilities` (the same governed call the act surfaces use) so the
// register and the buttons cannot disagree. This function writes nothing.

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

    const byStage = surfacesByStage();
    const audit = auditRegistry();
    const summary = summarizeRegistry();

    // Resolved text travels with the declaration so the surface renders the register's own wording
    // rather than re-writing it, and route templates are returned UNSOLVED: the surface knows its own
    // organization and committee refs and must not be handed a path assembled elsewhere.
    const surfaces = GOVERNANCE_SURFACES.map((s) => ({
      id: s.id, ar: s.ar, en: s.en, stage: s.stage,
      stage_label: SURFACE_STAGES[s.stage] || null,
      kind: s.kind,
      capability: s.capability, capability_source: s.capability_source,
      command: s.command, contract: s.contract,
      gated: s.gated === true, state_from: s.state_from || null,
      actor_binding: s.actor_binding || 'none',
      actor_binding_text: ACTOR_BINDINGS[s.actor_binding || 'none'] || null,
      bound_field: s.bound_field || null,
      route: s.route, route_file: s.route_file || null,
      unavailable: s.unavailable,
      unavailable_text: UNAVAILABLE_CLASSES[s.unavailable] || null,
      evidence: s.evidence, evidence_text: EVIDENCE_STATUSES[s.evidence] || null,
      suite: s.suite || null,
      recorded_path: s.recorded_path === true,
      recorded_path_evidence: s.recorded_path_evidence || null,
      note_ar: s.note_ar || null, note_en: s.note_en || null,
      awaiting_seated_actor: s.recorded_path !== true,
    }));

    return Response.json({
      status: 'ok',
      contract_version: GOVERNANCE_SURFACES_VERSION,
      generated_at: new Date().toISOString(),
      committee: { id: auth.trusted_target.derived_committee_id, name_ar: auth.target?.name_ar || auth.target?.name || null },
      authority: { capability: 'read', policy_version: auth.policy_version, effective_role: auth.effective_role },
      stages: Object.entries(SURFACE_STAGES).map(([key, v]) => ({ key, ...v, count: (byStage[key] || []).length })),
      surfaces,
      summary,
      registry_audit: audit,
      // What the register declares it must check, so the caller checks authority once per capability
      // instead of the register deciding availability itself.
      declared_capabilities: declaredCapabilities(),
      honesty_note: {
        ar: "هذا السجل يعلن نقصه من جهتين: (١) كل سطح لا يحمل دليلًا محفوظًا (بمرجع ارتباط) موسوم بأنه بانتظار فاعل مُقعد مُصادَق — وهذا نقص لا يمكن إخفاؤه؛ (٢) وقائمة الحقوق التي لم يُعد اشتقاقها في هذه الجولة مُسمّاة صراحةً، وهي قد تكون فارغة حين يُشتقّ الكل — والقائمة تبقى لأن السجل يجب أن يستطيع الإعلان لا أن يُلزم بنقص.",
        en: "This register declares two kinds of gap: (1) every surface without a recorded path (with a correlation reference) is flagged as awaiting an authorized seated actor, which is a gap that cannot be hidden; and (2) the capabilities not re-derived in this pass are named outright — a list that may legitimately be EMPTY when every right has been re-derived. The field stays because a register must be able to declare a gap, not because it must have one.",
      },
      no_surface_acts_alone: {
        ar: "لا سطح ينفّذ فعلًا بنفسه: كل فعل يسمّي أمرًا خادميًا محكومًا، وما لا أمر له يُعلن معطّلًا بسببه بدل أن يُنفَّذ من المتصفح.",
        en: "No surface performs an act by itself: every act names a governed server command, and one without a command is declared unavailable with its reason instead of being written from the browser.",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: GOVERNANCE_SURFACES_VERSION }, { status: 500 });
  }
}