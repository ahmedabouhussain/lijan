import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// ExtractInstrumentData — AI-assisted extraction from a founding instrument document.
// Supports Arabic, English, and bilingual documents via OCR + structured extraction.
// NEVER auto-creates or modifies official records. Returns proposed fields with
// confidence levels and source references for human review.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { instrument_id } = body;

    if (!instrument_id) {
      return Response.json({ error: 'instrument_id is required' }, { status: 400 });
    }

    const instrument = await base44.asServiceRole.entities.FoundingInstrument.get(instrument_id);
    if (!instrument) return Response.json({ error: 'Instrument not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, {
      committee_id: instrument.committee_id,
      capability: 'read',
    });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    if (!instrument.file_url) {
      return Response.json({ error: 'No document file attached to this instrument' }, { status: 400 });
    }

    // Mark as processing
    await base44.asServiceRole.entities.FoundingInstrument.update(instrument_id, {
      extraction_status: 'processing',
    });

    // Create AI extraction job record (granular job tracking)
    const extractionJob = await base44.asServiceRole.entities.AIExtractionJob.create({
      organization_id: auth.organization_id,
      instrument_id,
      instrument_version_id: null,
      job_type: 'field_extraction',
      job_status: 'processing',
      model_used: 'gemini_3_flash',
      prompt_summary: 'استخراج بيانات السند التأسيسي — حقول السند واللجنة والتشكيل والحوكمة',
      started_at: new Date().toISOString(),
      triggered_by_user_id: auth.user.id,
      triggered_by_name: auth.user.full_name || auth.user.email,
    });

    const prompt = `You are a legal document analyst specializing in Arabic and English government instruments.
Analyze the attached document and extract structured data about a committee establishment.

Return a JSON object with the following structure. For each field, provide:
- "value": the extracted value (string, or null if not found)
- "confidence": "high" | "medium" | "low" | "not_found"
- "source_page": page number if identifiable, else null
- "source_excerpt": brief excerpt from the source justifying the value, or null

Fields to extract:
{
  "instrument": {
    "instrument_type": "suggested type from: law, amiri_decree, amiri_decision, council_of_ministers_decision, ministerial_decision, administrative_decision, board_resolution, executive_decision, circular, directive, official_memorandum, official_letter, charter, terms_of_reference, policy_instrument, inter_entity_agreement, internal_governance_instrument, other",
    "instrument_number": null,
    "issuing_authority": null,
    "issue_date": null,
    "effective_date": null,
    "expiry_date": null
  },
  "committee": {
    "name_ar": null,
    "name_en": null,
    "committee_type": null,
    "purpose": null,
    "mandate": null,
    "powers": null,
    "prohibited_matters": null,
    "reporting_authority": null,
    "committee_term": null,
    "renewal_conditions": null,
    "meeting_frequency": null,
    "secretariat_responsibility": null
  },
  "formation": {
    "chair": null,
    "deputy_chair": null,
    "secretary": null,
    "members": null,
    "alternates": null,
    "observers": null,
    "represented_organizations": null
  },
  "governance": {
    "quorum": null,
    "voting_threshold": null,
    "casting_vote_rule": null,
    "recusal_rule": null,
    "delegation_rule": null,
    "alternate_rule": null,
    "required_approvals": null,
    "reporting_obligations": null,
    "closure_conditions": null
  },
  "signature_detected": false
}

CRITICAL RULES:
- Do NOT invent missing information. If a field is not found in the document, set confidence to "not_found" and value to null.
- For Arabic documents, extract Arabic values. For English, extract English. For bilingual, extract both where possible.
- "signature_detected" should be true only if a signature or stamp image is visually present in the document.
- Be conservative with confidence: "high" only for clearly stated values, "medium" for inferred, "low" for uncertain.
- Return ONLY the JSON object, no additional text.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [instrument.file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          instrument: { type: 'object' },
          committee: { type: 'object' },
          formation: { type: 'object' },
          governance: { type: 'object' },
          signature_detected: { type: 'boolean' },
        },
      },
      model: 'gemini_3_flash',
    });

    const extracted = result.data || result;

    await base44.asServiceRole.entities.FoundingInstrument.update(instrument_id, {
      extraction_status: 'extracted',
      extracted_data: JSON.stringify(extracted),
      signature_detected: extracted.signature_detected === true,
    });

    // Flatten extracted data into individual ExtractedInstrumentField records (granular field tracking)
    const confidenceMap = { high: 0.9, medium: 0.7, low: 0.4 };
    const fieldLabels = {
      'instrument.instrument_type': 'نوع السند', 'instrument.instrument_number': 'رقم السند',
      'instrument.issuing_authority': 'جهة الإصدار', 'instrument.issue_date': 'تاريخ الإصدار',
      'instrument.effective_date': 'تاريخ النفاذ', 'instrument.expiry_date': 'تاريخ الانتهاء',
      'committee.name_ar': 'اسم اللجنة (عربي)', 'committee.name_en': 'اسم اللجنة (إنجليزي)',
      'committee.committee_type': 'نوع اللجنة', 'committee.purpose': 'الغرض',
      'committee.mandate': 'الصلاحية', 'committee.powers': 'الصلاحيات',
      'committee.reporting_authority': 'جهة الرفع', 'committee.meeting_frequency': 'تواتر الاجتماعات',
      'formation.chair': 'الرئيس', 'formation.deputy_chair': 'نائب الرئيس',
      'formation.secretary': 'الأمين', 'formation.members': 'الأعضاء',
      'formation.alternates': 'البدلاء', 'formation.observers': 'المراقبون',
      'governance.quorum': 'النصاب', 'governance.voting_threshold': 'عتبة التصويت',
      'governance.casting_vote_rule': 'قاعدة التصويت الحاسم', 'governance.recusal_rule': 'قاعدة التنحي',
      'governance.delegation_rule': 'قاعدة التفويض', 'governance.alternate_rule': 'قاعدة البدلاء',
    };

    const flatFields = [];
    for (const [section, fields] of Object.entries(extracted)) {
      if (section === 'signature_detected' || typeof fields !== 'object' || fields === null) continue;
      for (const [key, val] of Object.entries(fields || {})) {
        if (typeof val !== 'object' || val === null) continue;
        const value = val.value;
        const conf = val.confidence;
        if (!value || conf === 'not_found') continue;
        const fieldKey = `${section}.${key}`;
        flatFields.push({
          organization_id: auth.organization_id,
          instrument_id,
          extraction_job_id: extractionJob.id,
          field_key: fieldKey,
          field_label: fieldLabels[fieldKey] || fieldKey,
          extracted_value: String(value).slice(0, 2000),
          confidence: confidenceMap[conf] || 0.5,
          source_snippet: val.source_excerpt || null,
          review_status: 'pending',
          field_type: key.includes('date') ? 'date' : key.includes('members') ? 'entity_reference' : 'text',
        });
      }
    }

    if (flatFields.length > 0) {
      await base44.asServiceRole.entities.ExtractedInstrumentField.bulkCreate(flatFields);
    }

    // Update extraction job with results
    const avgConfidence = flatFields.length > 0
      ? flatFields.reduce((sum, f) => sum + f.confidence, 0) / flatFields.length
      : 0;
    await base44.asServiceRole.entities.AIExtractionJob.update(extractionJob.id, {
      job_status: 'completed',
      completed_at: new Date().toISOString(),
      field_count: flatFields.length,
      average_confidence: Math.round(avgConfidence * 100) / 100,
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id,
      committee_id: instrument.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'update', entity_type: 'FoundingInstrument', entity_id: instrument_id,
      entity_title: instrument.title_ar,
      description: 'استخراج بيانات السند بالذكاء الاصطناعي',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      extracted,
      warning: extracted.signature_detected
        ? 'تم اكتشاف توقيع/ختم — لكنه غير موثَّق مستقلاً (Detected, Not independently verified)'
        : null,
    });
  } catch (error) {
    // Mark extraction as failed
    try {
      const body = await req.json().catch(() => ({}));
      if (body.instrument_id) {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.FoundingInstrument.update(body.instrument_id, {
          extraction_status: 'not_started',
        }).catch(() => {});
      }
    } catch (e) {}
    return Response.json({ error: error.message }, { status: 500 });
  }
}