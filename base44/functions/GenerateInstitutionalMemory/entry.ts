import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

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

    // Gather committee data for memory compilation
    const [members, meetings, decisions, actions, minutes] = await Promise.all([
      base44.asServiceRole.entities.CommitteeMembership.filter({ committee_id }).catch(() => []),
      base44.asServiceRole.entities.Meeting.filter({ committee_id }).catch(() => []),
      base44.asServiceRole.entities.Decision.filter({ committee_id }).catch(() => []),
      base44.asServiceRole.entities.Action.filter({ committee_id }).catch(() => []),
      base44.asServiceRole.entities.MeetingMinutes.filter({ committee_id }).catch(() => []),
    ]);

    // Build source references from approved records only
    const approvedDecisions = (decisions || []).filter((d) => ['approved', 'issued', 'completed'].includes(d.status));
    const completedActions = (actions || []).filter((a) => ['verified', 'closed', 'completed'].includes(a.status));
    const approvedMinutes = (minutes || []).filter((m) => m.status === 'approved' || m.approved === true);

    const decisionRefs = approvedDecisions.map((d) => ({
      record_type: 'Decision',
      record_id: d.id,
      record_number: d.decision_number || '',
      record_title: d.title || '',
    }));
    const actionRefs = completedActions.map((a) => ({
      record_type: 'Action',
      record_id: a.id,
      record_title: a.title || '',
    }));
    const minuteRefs = approvedMinutes.map((m) => ({
      record_type: 'MeetingMinutes',
      record_id: m.id,
    }));

    const allRefs = [...decisionRefs, ...actionRefs, ...minuteRefs];

    const decisionSummaries = approvedDecisions
      .map((d) => `- ${d.title}: ${d.outcome || d.proposal || '—'}`)
      .join('\n');
    const actionSummaries = completedActions
      .map((a) => `- ${a.title}: ${a.owner_name}`)
      .join('\n');

    const prompt = `أنت مؤرشف مؤسسي. أنشئ ذاكرة مؤسسية للجنة التالية بصيغة JSON منظمة.
لا تستخدم HTML أو Markdown. أعد نصاً عربياً نقياً فقط.

اللجنة: ${committee.name_ar || committee.name_en}
الصلاحية: ${committee.mandate || '—'}
عدد الأعضاء: ${(members || []).length}
عدد الاجتماعات المعتمدة: ${(approvedMinutes || []).length}

القرارات المعتمدة (${approvedDecisions.length}):
${decisionSummaries || 'لا توجد قرارات معتمدة'}

الإجراءات المنجزة (${completedActions.length}):
${actionSummaries || 'لا توجد إجراءات منجزة'}

أعد JSON يحتوي على مصفوفة "sections"، كل عنصر يحتوي على:
- section_type: واحد من [key_achievements, lessons_learned, patterns, recommendations, open_items]
- title_ar: عنوان عربي
- title_en: عنوان إنجليزي
- summary_ar: ملخص عربي نقي (بدون HTML أو Markdown)
- summary_en: ملخص إنجليزي
- evidence_status: واحد من [verified, partial, insufficient]
- confidence: رقم بين 0 و 1

إذا لم توجد أدلة كافية لقسم ما، استخدم evidence_status = "insufficient" و confidence = 0.
لا تخترع وقائع غير موجودة في البيانات.`;

    // Invoke LLM server-side with structured JSON schema
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                section_type: { type: 'string' },
                title_ar: { type: 'string' },
                title_en: { type: 'string' },
                summary_ar: { type: 'string' },
                summary_en: { type: 'string' },
                evidence_status: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
          },
        },
      },
    });

    // Attach source references to each section
    const sections = (llmResponse.sections || []).map((sec) => ({
      ...sec,
      source_references: allRefs.slice(0, 5),
      confidence: typeof sec.confidence === 'number' ? sec.confidence : 0.5,
    }));

    const plainTextSummary = sections
      .map((s) => `${s.title_ar || s.section_type}: ${s.summary_ar || ''}`)
      .join(' — ')
      .substring(0, 500);

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