// Memory Compiler — shared logic for institutional memory compilation.
// Imported by GenerateInstitutionalMemory (closure) and CompileCommitteeMemory (periodic).

export interface MemorySection {
  section_type: string;
  title_ar: string;
  title_en: string;
  summary_ar: string;
  summary_en: string;
  evidence_status: 'verified' | 'partial' | 'insufficient';
  confidence: number;
  source_references?: Array<{ record_type: string; record_id: string; record_number?: string; record_title?: string }>;
}

export async function gatherCommitteeSources(base44: any, committee_id: string) {
  const [members, meetings, decisions, actions, minutes, amendments] = await Promise.all([
    base44.asServiceRole.entities.CommitteeMembership.filter({ committee_id, status: 'active' }).catch(() => []),
    base44.asServiceRole.entities.Meeting.filter({ committee_id }).catch(() => []),
    base44.asServiceRole.entities.Decision.filter({ committee_id }).catch(() => []),
    base44.asServiceRole.entities.Action.filter({ committee_id }).catch(() => []),
    base44.asServiceRole.entities.MeetingMinutes.filter({ committee_id }).catch(() => []),
    base44.asServiceRole.entities.CommitteeAmendment.filter({ committee_id }).catch(() => []),
  ]);

  const approvedDecisions = (decisions || []).filter((d) => ['approved', 'issued', 'completed'].includes(d.status));
  const completedActions = (actions || []).filter((a) => ['verified', 'closed', 'completed'].includes(a.status));
  const approvedMinutes = (minutes || []).filter((m) => m.status === 'approved' || m.approved === true);
  const effectiveAmendments = (amendments || []).filter((a) => ['effective', 'approved'].includes(a.status));
  const completedMeetings = (meetings || []).filter((m) => ['completed', 'adjourned'].includes(m.status));

  const sourceRefs = [
    ...approvedDecisions.map((d) => ({ record_type: 'Decision', record_id: d.id, record_number: d.decision_number || '', record_title: d.title || '' })),
    ...completedActions.map((a) => ({ record_type: 'Action', record_id: a.id, record_title: a.title || '' })),
    ...approvedMinutes.map((m) => ({ record_type: 'MeetingMinutes', record_id: m.id })),
    ...effectiveAmendments.map((a) => ({ record_type: 'Amendment', record_id: a.id, record_title: a.amendment_type || '' })),
  ];

  return {
    members: members || [],
    meetings: completedMeetings,
    decisions: approvedDecisions,
    actions: completedActions,
    minutes: approvedMinutes,
    amendments: effectiveAmendments,
    sourceRefs,
  };
}

export function buildMemoryPrompt(committee: any, sources: any): string {
  const decisionData = sources.decisions.map((d) => ({
    title: d.title, status: d.status, outcome: d.outcome || '', legal_basis: d.legal_basis || '',
  }));
  const actionData = sources.actions.map((a) => ({
    title: a.title, owner: a.owner_name, status: a.status, deadline: a.deadline,
  }));
  const meetingData = sources.meetings.map((m) => ({
    title: m.title, date: m.date, status: m.status, mode: m.mode,
  }));

  return `أنت مؤرشف مؤسسي خبير. أنشئ ذاكرة مؤسسية شاملة للجنة التالية بصيغة JSON منظمة.
لا تستخدم HTML أو Markdown. نص عربي نقي فقط.

اللجنة: ${committee.name_ar || committee.name_en}
الصلاحية: ${committee.mandate || '—'}
عدد الأعضاء النشطين: ${sources.members.length}
عدد الاجتماعات المنعقدة: ${sources.meetings.length}
عدد القرارات المعتمدة: ${sources.decisions.length}
عدد الإجراءات المنجزة: ${sources.actions.length}
عدد التعديلات النافذة: ${sources.amendments.length}

القرارات المعتمدة:
${JSON.stringify(decisionData, null, 2).substring(0, 2000)}

الإجراءات المنجزة:
${JSON.stringify(actionData, null, 2).substring(0, 1500)}

الاجتماعات المنعقدة:
${JSON.stringify(meetingData, null, 2).substring(0, 1000)}

أنشئ JSON يحتوي على مصفوفة "sections"، كل عنصر:
- section_type: واحد من [key_achievements, lessons_learned, patterns, recommendations, open_items, decision_precedent]
- title_ar: عنوان عربي
- title_en: عنوان إنجليزي
- summary_ar: ملخص عربي نقي (بدون HTML أو Markdown)
- summary_en: ملخص إنجليزي
- evidence_status: واحد من [verified, partial, insufficient]
- confidence: رقم بين 0 و 1

قواعد الأدلة:
- verified: توجد سجلات معتمدة تدعم القسم (confidence >= 0.7)
- partial: توجد بعض الأدلة لكن غير كاملة (confidence 0.3-0.7)
- insufficient: لا توجد أدلة كافية (confidence < 0.3) — استخدم نص "أدلة غير كافية"

لا تخترع وقائع غير موجودة في البيانات. إذا لم توجد بيانات لقسم ما، استخدم evidence_status = "insufficient".`;
}

export async function compileMemorySections(base44: any, committee: any, sources: any): Promise<MemorySection[]> {
  const prompt = buildMemoryPrompt(committee, sources);

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

  return (llmResponse.sections || []).map((sec) => ({
    ...sec,
    source_references: sources.sourceRefs.slice(0, 8),
    confidence: typeof sec.confidence === 'number' ? sec.confidence : 0.5,
  }));
}

export function buildPlainTextSummary(sections: MemorySection[]): string {
  return sections
    .map((s) => `${s.title_ar || s.section_type}: ${s.summary_ar || ''}`)
    .join(' — ')
    .substring(0, 500);
}