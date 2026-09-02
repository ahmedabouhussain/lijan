import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';
import { gatherCommitteeSources, compileMemorySections, buildPlainTextSummary } from '../../shared/memoryCompiler.ts';

// GenerateInstitutionalMemory — server-side AI for committee closure memory transfer.
// Returns STRUCTURED JSON sections (no HTML/Markdown) for safe client rendering.
// Each section carries source_references, evidence_status, and confidence.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id } = body;
    if (!committee_id) return Response.json({ error: 'committee_id is required' }, { status: 400 });

    // Resolve authority — only chair or org_owner can compile closure memory
    const auth = await resolveAuthority(base44, { committee_id, capability: 'committee.close' });
    if (!auth.allowed) {
      return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });
    }

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id);
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    // Gather and filter source data using shared module
    const sources = await gatherCommitteeSources(base44, committee_id);

    // Compile structured memory sections via LLM
    const sections = await compileMemorySections(base44, committee, sources);

    const plainTextSummary = buildPlainTextSummary(sections);

    // Create AIOutputLedger entry with structured content
    const ledgerEntry = await base44.asServiceRole.entities.AIOutputLedger.create({
      organization_id: auth.organization_id,
      output_type: 'institutional_memory',
      source_entity_type: 'Committee',
      source_entity_id: committee_id,
      source_title: committee.name_ar || committee.name_en,
      committee_id,
      model_used: 'automatic',
      prompt_summary: 'توليد ذاكرة مؤسسية منظمة لإغلاق اللجنة',
      output_summary: plainTextSummary,
      structured_content: JSON.stringify(sections),
      generated_at: new Date().toISOString(),
      generated_by_user_id: auth.user.id,
      generated_by_name: auth.user.full_name || auth.user.email,
      human_reviewed: false,
      status: 'generated',
    });

    // Audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id,
      committee_id,
      actor_user_id: auth.user.id,
      actor_name: auth.user.full_name || auth.user.email,
      action: 'create',
      entity_type: 'AIOutputLedger',
      entity_id: ledgerEntry.id,
      description: 'AI-generated institutional memory for committee closure',
      correlation_id: auth.correlation_id,
      authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      summary,
      ledger_id: ledgerEntry.id,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}