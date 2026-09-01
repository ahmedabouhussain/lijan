import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// GenerateInstitutionalMemory — server-side AI for committee closure memory transfer.
// Replaces the unsafe client-side InvokeLLM call in CommitteeClosure.jsx.
// Creates AIOutputLedger entry with source citations and human-review status.

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

    // Gather committee data for memory compilation
    const [members, meetings, decisions, actions, minutes] = await Promise.all([
      base44.asServiceRole.entities.CommitteeMembership.filter({ committee_id }).catch(() => []),
      base44.asServiceRole.entities.Meeting.filter({ committee_id }).catch(() => []),
      base44.asServiceRole.entities.Decision.filter({ committee_id }).catch(() => []),
      base44.asServiceRole.entities.Action.filter({ committee_id }).catch(() => []),
      base44.asServiceRole.entities.MeetingMinutes.filter({ committee_id }).catch(() => []),
    ]);

    const decisionSummaries = (decisions || [])
      .map((d) => `- ${d.title} (${d.status}): ${d.outcome || d.proposal || '—'}`)
      .join('\n');
    const actionSummaries = (actions || [])
      .map((a) => `- ${a.title}: ${a.owner_name} (${a.status})`)
      .join('\n');

    const prompt = `أنت مؤرشف مؤسسي. استخرج الذاكرة المؤسسية للجنة التالية بصيغة احترافية رسمية باللغة العربية:

اللجنة: ${committee.name_ar || committee.name_en}
الصلاحية: ${committee.mandate || '—'}
عدد الأعضاء: ${(members || []).length}
عدد الاجتماعات: ${(meetings || []).length}

القرارات (${(decisions || []).length}):
${decisionSummaries}

الإجراءات (${(actions || []).length}):
${actionSummaries}

قدم ملخص الذاكرة المؤسسية يشمل:
1. الإنجازات الرئيسية (key_achievements)
2. الدروس المستفادة (lessons_learned)
3. الأنماط الملاحظة (patterns)
4. التوصيات للجنة الخلف (recommendations)

أعد النتيجة بصيغة JSON بالحقول: key_achievements, lessons_learned, patterns, recommendations`;

    // Invoke LLM server-side
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          key_achievements: { type: 'string' },
          lessons_learned: { type: 'string' },
          patterns: { type: 'string' },
          recommendations: { type: 'string' },
        },
      },
    });

    const summary = `## الإنجازات الرئيسية\n${llmResponse.key_achievements}\n\n## الدروس المستفادة\n${llmResponse.lessons_learned}\n\n## الأنماط الملاحظة\n${llmResponse.patterns}\n\n## التوصيات للجنة الخلف\n${llmResponse.recommendations}`;

    // Create AIOutputLedger entry
    const ledgerEntry = await base44.asServiceRole.entities.AIOutputLedger.create({
      output_type: 'summary',
      source_entity_type: 'Committee',
      source_entity_id: committee_id,
      source_title: committee.name_ar || committee.name_en,
      committee_id,
      model_used: 'automatic',
      prompt_summary: 'توليد ملخص الذاكرة المؤسسية لإغلاق اللجنة',
      output_summary: summary.substring(0, 500),
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