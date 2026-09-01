import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// ConfirmExtractedInstrumentFields — human confirmation of AI-extracted data.
// Marks extraction as confirmed. Does NOT create or modify official committee records.
// The confirmed data can later be used by CreateCommitteeDraftFromInstrument.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { instrument_id, confirmed_fields, reviewer_notes } = body;

    if (!instrument_id) return Response.json({ error: 'instrument_id is required' }, { status: 400 });

    const instrument = await base44.asServiceRole.entities.FoundingInstrument.get(instrument_id);
    if (!instrument) return Response.json({ error: 'Instrument not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, {
      committee_id: instrument.committee_id,
      capability: 'committee.manage',
    });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    // Merge confirmed fields (human-corrected) with extracted data
    const existingExtracted = instrument.extracted_data ? JSON.parse(instrument.extracted_data) : {};
    const merged = { ...existingExtracted, ...confirmed_fields, _human_reviewed: true };

    await base44.asServiceRole.entities.FoundingInstrument.update(instrument_id, {
      extraction_status: 'confirmed',
      extracted_data: JSON.stringify(merged),
      verified_by_user_id: auth.user.id,
      verified_by_name: auth.user.full_name || auth.user.email,
      verified_at: new Date().toISOString(),
    });

    // Mark all pending extracted fields as confirmed (granular field review tracking)
    await base44.asServiceRole.entities.ExtractedInstrumentField.updateMany(
      { instrument_id, review_status: 'pending' },
      { $set: {
        review_status: 'confirmed',
        reviewed_by_name: auth.user.full_name || auth.user.email,
        reviewed_by_user_id: auth.user.id,
        reviewed_at: new Date().toISOString(),
      }}
    ).catch(() => {});

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: instrument.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'approve', entity_type: 'FoundingInstrument', entity_id: instrument_id,
      entity_title: instrument.title_ar,
      description: 'تأكيد بيانات السند المستخرجة بالذكاء الاصطناعي (مراجعة بشرية)',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', instrument_id, extraction_status: 'confirmed' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}