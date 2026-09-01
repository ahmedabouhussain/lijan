import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Extract committee governance fields from an uploaded establishing document
// (decision / circular / decree / charter) using AI vision + reasoning.
// Input: { file_url }
// Output: { name_ar, name_en, type, mandate, appointing_authority, term_start, term_end,
//           chair_name, secretary_name, quorum_count, voting_rule, meeting_cadence,
//           classification, establishing_doc_type, establishing_doc_reference,
//           establishing_doc_date, extracted_summary }

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_url } = body;
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const prompt = `أنت خبير في الحوكمة المؤسسية للجهات الحكومية وشبه الحكومية في دولة قطر. تم رفع مستند إنشاء لجنة (قرار / تعميم / ميثاق / مرسوم / لائحة). حلّل المستند بدقة واستخرج منه الحقول التالية باستخدام لغة رسمية مؤسسية. املأ الحقول التي يرد ذكرها في المستند فقط؛ وإذا لم تُذكر قيمة معينة فاتركها فارغة (سلسلة فارغة للنصوص، و null للأرقام). حدّد نوع المستند (establishing_doc_type) بناءً على صيغته: قرار = decision، تعميم = circular، مرسوم = decree، قرار جمهوري / قرار وزاري = resolution، ميثاق / لائحة = charter، غير ذلك = other. استخرج الرقم المرجعي وتاريخ الإصدار إن وُجدا. للاختصاص (mandate) اكتب فقرة واضحة بالعربية تلخّص صلاحية اللجنة ونطاقها. لـ appointing_authority اكتب اسم الجهة المُصدِرة. حوّل التواريخ إلى صيغة YYYY-MM-DD إن أمكن.`;

    const responseSchema = {
      type: 'object',
      properties: {
        name_ar: { type: 'string' },
        name_en: { type: 'string' },
        type: {
          type: 'string',
          enum: [
            'permanent_council', 'permanent_committee', 'temporary_committee',
            'ministerial_committee', 'national_committee', 'task_force',
            'working_group', 'advisory_committee', 'special_committee',
            'joint_committee', 'cross_institutional'
          ]
        },
        mandate: { type: 'string' },
        appointing_authority: { type: 'string' },
        term_start: { type: 'string' },
        term_end: { type: 'string' },
        chair_name: { type: 'string' },
        secretary_name: { type: 'string' },
        quorum_count: { type: 'number' },
        voting_rule: {
          type: 'string',
          enum: ['simple_majority', 'two_thirds', 'unanimous', 'chair_decides']
        },
        meeting_cadence: {
          type: 'string',
          enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'ad_hoc']
        },
        classification: {
          type: 'string',
          enum: ['public', 'internal', 'confidential', 'restricted', 'highly_restricted']
        },
        establishing_doc_type: {
          type: 'string',
          enum: ['decision', 'circular', 'decree', 'resolution', 'charter', 'other']
        },
        establishing_doc_reference: { type: 'string' },
        establishing_doc_date: { type: 'string' },
        extracted_summary: { type: 'string' }
      }
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: responseSchema,
    });

    // AIOutputLedger — every AI operation must be logged
    await base44.asServiceRole.entities.AIOutputLedger.create({
      organization_id: null,
      output_type: 'governance_doc',
      source_entity_type: 'Committee',
      source_title: 'استخلاص بيانات اللجنة من مستند التأسيس',
      model_used: 'automatic',
      prompt_summary: 'استخلاص حقول الحوكمة من مستند إنشاء اللجنة المرفوع',
      output_summary: JSON.stringify(result).substring(0, 500),
      generated_at: new Date().toISOString(),
      generated_by_user_id: user.id,
      generated_by_name: user.full_name || user.email,
      human_reviewed: false,
      status: 'generated',
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}