import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';
import { gatherCommitteeSources, compileMemorySections, buildPlainTextSummary } from '../../shared/memoryCompiler.ts';

// CompileCommitteeMemory — compiles structured institutional memory from all
// committee sources (decisions, actions, meetings, minutes) at any time.
// Not limited to closure — can be called periodically to update memory.
// Returns evidence-grounded sections with source references.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, mode } = body; // mode: 'full' | 'incremental'
    if (!committee_id) return Response.json({ error: 'committee_id is required' }, { status: 400 });

    const auth = await resolveAuthority(base44, { committee_id, capability: 'committee.view' });
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

    // Check if there's an existing memory entry to update (incremental mode)
    let existingEntry = null;
    if (mode === 'incremental') {
      try {
        const existing = await base44.asServiceRole.entities.AIOutputLedger.filter({
          committee_id,
          output_type: 'institutional_memory',
          source_entity_type: 'Committee',
        }, '-created_date', 1);
        existingEntry = (existing || [])[0];
      } catch {}
    }

    let ledgerEntry;
    if (existingEntry && mode === 'incremental') {
      // Update existing entry
      ledgerEntry = await base44.asServiceRole.entities.AIOutputLedger.update(existingEntry.id, {
        output_summary: plainTextSummary,
        structured_content: JSON.stringify(sections),
        generated_at: new Date().toISOString(),
        generated_by_user_id: auth.user.id,
        generated_by_name: auth.user.full_name || auth.user.email,
        status: 'amended',
        human_reviewed: false,
      });
    } else {
      // Create new entry
      ledgerEntry = await base44.asServiceRole.entities.AIOutputLedger.create({
        organization_id: auth.organization_id,
        output_type: 'institutional_memory',
        source_entity_type: 'Committee',
        source_entity_id: committee_id,
        source_title: committee.name_ar || committee.name_en,
        committee_id,
        model_used: 'automatic',
        prompt_summary: 'تجميع ذاكرة مؤسسية شاملة',
        output_summary: plainTextSummary,
        structured_content: JSON.stringify(sections),
        generated_at: new Date().toISOString(),
        generated_by_user_id: auth.user.id,
        generated_by_name: auth.user.full_name || auth.user.email,
        human_reviewed: false,
        status: 'generated',
      });
    }

    // Audit
    try {
      await base44.asServiceRole.entities.AuditEvent.create({
        organization_id: auth.organization_id,
        committee_id,
        actor_user_id: auth.user.id,
        actor_name: auth.user.full_name || auth.user.email,
        action: 'create',
        entity_type: 'AIOutputLedger',
        entity_id: ledgerEntry.id,
        description: `Compiled committee memory (${mode || 'full'} mode)`,
        correlation_id: auth.correlation_id,
      });
    } catch {}

    return Response.json({
      status: 'ok',
      ledger_id: ledgerEntry.id,
      sections,
      source_count: sources.sourceRefs.length,
      mode: mode || 'full',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}