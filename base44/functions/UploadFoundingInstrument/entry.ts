import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// UploadFoundingInstrument — registers an official founding instrument for a committee.
// The file is uploaded client-side via UploadFile; this function creates the immutable record.
// Does NOT verify legal authenticity — signature/stamp detection is "detected, not verified".

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      committee_id, instrument_type, custom_type, custom_description, issuing_authority_custom,
      title_ar, title_en, instrument_number, issuing_authority, issuer_name, issuer_capacity,
      issue_date, effective_date, expiry_date, jurisdiction, official_reference, publication_reference,
      language, classification, confidentiality_restrictions,
      parent_instrument_id, supersedes_instrument_id, amended_instrument_id,
      file_url, original_filename, mime_type, file_size, content_hash,
      notes,
    } = body;

    if (!committee_id || !instrument_type || !title_ar) {
      return Response.json({ error: 'committee_id, instrument_type, title_ar are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'committee.manage' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    if (instrument_type === 'other' && !custom_type) {
      return Response.json({ error: 'custom_type is required when instrument_type is "other"' }, { status: 400 });
    }

    const instrument = await base44.asServiceRole.entities.FoundingInstrument.create({
      organization_id: auth.organization_id,
      committee_id,
      instrument_type,
      custom_type: custom_type || null,
      custom_description: custom_description || null,
      issuing_authority_custom: issuing_authority_custom || null,
      title_ar,
      title_en: title_en || null,
      instrument_number: instrument_number || null,
      issuing_authority: issuing_authority || null,
      issuer_name: issuer_name || null,
      issuer_capacity: issuer_capacity || null,
      issue_date: issue_date || null,
      effective_date: effective_date || null,
      expiry_date: expiry_date || null,
      jurisdiction: jurisdiction || null,
      official_reference: official_reference || null,
      publication_reference: publication_reference || null,
      language: language || 'ar',
      classification: classification || 'internal',
      confidentiality_restrictions: confidentiality_restrictions || null,
      document_status: 'draft',
      parent_instrument_id: parent_instrument_id || null,
      supersedes_instrument_id: supersedes_instrument_id || null,
      amended_instrument_id: amended_instrument_id || null,
      file_url: file_url || null,
      original_filename: original_filename || null,
      mime_type: mime_type || null,
      file_size: file_size || null,
      content_hash: content_hash || null,
      uploaded_by_user_id: auth.user.id,
      uploaded_by_name: auth.user.full_name || auth.user.email,
      signature_detected: false,
      signature_verified: false,
      extraction_status: 'not_started',
      notes: notes || null,
      version: 1,
    });

    // Create initial instrument version record (granular version tracking)
    await base44.asServiceRole.entities.InstrumentVersion.create({
      organization_id: auth.organization_id,
      committee_id,
      instrument_id: instrument.id,
      version_number: 1,
      file_url: file_url || null,
      original_filename: original_filename || null,
      mime_type: mime_type || null,
      file_size: file_size || null,
      content_hash: content_hash || null,
      change_summary: 'النسخة الأولى — تسجيل السند التأسيسي',
      language: language || 'ar',
      uploaded_by_user_id: auth.user.id,
      uploaded_by_name: auth.user.full_name || auth.user.email,
      uploaded_at: new Date().toISOString(),
      is_current: true,
      status: 'active',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'create', entity_type: 'FoundingInstrument', entity_id: instrument.id,
      entity_title: title_ar,
      description: `تسجيل سند تأسيس: ${title_ar} (${instrument_type})`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', instrument });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}