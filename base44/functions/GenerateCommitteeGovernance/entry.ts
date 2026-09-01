import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Generate full bilingual governance structure for a committee using AI.
// Input: { committee_name_ar, committee_name_en, type, institution_name_ar, institution_name_en }
// Output: { mandate_ar, mandate_en, scope_ar, scope_en, establishing_authority_ar, establishing_authority_en,
//           quorum_count, voting_rule, meeting_cadence, classification, reporting_requirements_ar,
//           reporting_requirements_en, suggested_members: [{full_name, role, authority_level, institution_name}] }

const VALID_TYPES = [
  "permanent_council", "permanent_committee", "temporary_committee", "ministerial_committee",
  "national_committee", "task_force", "working_group", "advisory_committee",
  "special_committee", "joint_committee", "cross_institutional"
];

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { committee_name_ar, committee_name_en, type, institution_name_ar, institution_name_en } = body;

    if (!committee_name_ar && !committee_name_en) {
      return Response.json({ error: "Committee name (Arabic or English) is required" }, { status: 400 });
    }
    const committeeType = VALID_TYPES.includes(type) ? type : "permanent_committee";

    const prompt = `You are an expert institutional governance advisor for Qatari government and semi-government entities. Generate a complete, accurate, and authoritative governance structure for a new committee.

COMMITTEE DETAILS:
- Name (Arabic): ${committee_name_ar || committee_name_en}
- Name (English): ${committee_name_en || committee_name_ar}
- Type: ${committeeType}
- Parent Institution (Arabic): ${institution_name_ar || "غير محدد"}
- Parent Institution (English): ${institution_name_en || "Not specified"}

Generate the FULL governance package in BOTH Arabic and English, using formal business/government language. The content must be:
1. MANDATE (الصلاحية): A clear, authoritative statement of the committee's delegated authority and purpose (3-4 sentences each language).
2. SCOPE (النطاق): Specific responsibilities and boundaries of authority (bullet-form, 4-6 points each language).
3. ESTABLISHING AUTHORITY (الجهة المؤسِّسة): The body that created/authorizes this committee, with a plausible decree/reference format.
4. QUORUM: Recommended minimum quorum count (number, typically 3-7).
5. VOTING RULE: One of: simple_majority, two_thirds, unanimous, chair_decides.
6. MEETING CADENCE: One of: weekly, biweekly, monthly, quarterly, ad_hoc.
7. CLASSIFICATION: One of: public, internal, confidential, restricted, highly_restricted.
8. REPORTING REQUIREMENTS: What reports, to whom, how often (1-2 sentences each language).
9. SUGGESTED MEMBERS: 3-5 suggested member roles with plausible titles, roles (chair, vice_chair, secretary, member, observer), authority levels (decision, approval, execution, oversight, escalation, advisory), and the parent institution name. Use realistic Qatari government role titles (e.g., "الوكيل", "الرئيس التنفيذي", "المدير العام"). Do NOT use real personal names — use role titles only.

Return ONLY the JSON object matching the schema. Be precise, formal, and institutional.`;

    const responseSchema = {
      type: "object",
      properties: {
        mandate_ar: { type: "string" },
        mandate_en: { type: "string" },
        scope_ar: { type: "string" },
        scope_en: { type: "string" },
        establishing_authority_ar: { type: "string" },
        establishing_authority_en: { type: "string" },
        quorum_count: { type: "number" },
        voting_rule: { type: "string" },
        meeting_cadence: { type: "string" },
        classification: { type: "string" },
        reporting_requirements_ar: { type: "string" },
        reporting_requirements_en: { type: "string" },
        suggested_members: {
          type: "array",
          items: {
            type: "object",
            properties: {
              full_name: { type: "string" },
              full_name_ar: { type: "string" },
              role: { type: "string" },
              authority_level: { type: "string" },
              institution_name: { type: "string" }
            }
          }
        }
      }
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: responseSchema,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}