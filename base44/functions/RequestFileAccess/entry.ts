import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  evaluateAccess,
  fingerprintRef,
  LINK_TTL_SECONDS,
  type ActorDescriptor,
} from '../../shared/fileAccessPolicy.ts';

/**
 * RequestFileAccess — the single governed path to a private governance file.
 *
 * Order is enforced here, not in the client:
 *   1. authenticate the user
 *   2. identify the record, its committee and its organization
 *   3. evaluate permission, purpose and classification (shared policy)
 *   4. decide
 *   5. on allow, mint a short-lived signed link
 *   6. record the event and the decision
 *   7. on deny, record the refusal with safe information only
 *
 * The caller never names the file: the reference is read from the record itself,
 * so a client cannot ask the gate to sign an arbitrary path.
 */

const ACTIONS = ['preview', 'download', 'share', 'print'];

/** Where a governed file lives on each record type, and how to read its scope. */
const REF_SOURCES: Record<string, { field: string; committeeField?: string; orgField?: string; classificationField?: string }> = {
  Signature: { field: 'signature_image_url', committeeField: 'committee_id', orgField: 'organization_id' },
  FoundingInstrument: { field: 'file_url', committeeField: 'committee_id', orgField: 'organization_id', classificationField: 'classification' },
  InstrumentVersion: { field: 'file_url', committeeField: 'committee_id', orgField: 'organization_id' },
  DocumentVersion: { field: 'file_url', committeeField: 'committee_id', orgField: 'organization_id', classificationField: 'classification' },
  Document: { field: 'file_url', committeeField: 'committee_id', orgField: 'organization_id', classificationField: 'classification' },
  DocumentAsset: { field: 'file_url', committeeField: 'committee_id', orgField: 'organization_id' },
  MeetingPack: { field: 'file_url', committeeField: 'committee_id', orgField: 'organization_id' },
  MeetingMinutes: { field: 'file_url', committeeField: 'committee_id', orgField: 'organization_id' },
  Decision: { field: 'file_url', committeeField: 'committee_id', orgField: 'organization_id' },
  ProductInstance: { field: 'storage_key', committeeField: 'committee_id', orgField: 'organization_id', classificationField: 'classification' },
  EvidenceSubmissionEntry: { field: 'file_url', committeeField: 'committee_id', orgField: 'organization_id' },
  Committee: { field: 'logo_url', orgField: 'organization_id' },
  Organization: { field: 'logo_url' },
};

const MESSAGE = {
  ar: {
    unauthenticated: 'يلزم تسجيل الدخول للوصول إلى هذا الملف.',
    out_of_scope: 'هذا الملف خارج نطاق جهتك.',
    not_a_member: 'هذا الملف متاح لأعضاء اللجنة فقط.',
    membership_not_active: 'عضويتك في هذه اللجنة غير سارية.',
    insufficient_role: 'تصنيف الملف يتطلب صلاحية أعلى في اللجنة.',
    purpose_required: 'مشاركة ملف بهذا التصنيف تتطلب بيان الغرض.',
    not_found_or_denied: 'تعذّر الوصول إلى هذا الملف.',
    unsupported_field: 'نوع الملف غير مدعوم في المسار المحكوم.',
    not_found_or_empty: 'لا يوجد ملف مرتبط بهذا السجل.',
    legacy_pending_migration: 'هذا الملف من الروابط القديمة وهو قيد الترحيل إلى التخزين الخاص، ولا يُعرض برابط عام.',
    public_asset: 'هذا أصل عام معتمد.',
  },
  en: {
    unauthenticated: 'Sign in to access this file.',
    out_of_scope: 'This file is outside your organization scope.',
    not_a_member: 'This file is available to committee members only.',
    membership_not_active: 'Your seat in this committee is not active.',
    insufficient_role: 'This classification requires a higher committee role.',
    purpose_required: 'Sharing a file of this classification requires a stated purpose.',
    not_found_or_denied: 'This file could not be accessed.',
    unsupported_field: 'This file type is not served through the governed path.',
    not_found_or_empty: 'No file is attached to this record.',
    legacy_pending_migration: 'This file is a legacy public link pending migration to private storage; it is not served publicly.',
    public_asset: 'This is an approved public asset.',
  },
};

async function recordAudit(base44, payload) {
  try {
    await base44.asServiceRole.entities.AuditEvent.create(payload);
  } catch (error) {
    console.error('File access audit failed:', error?.message || error);
  }
}

async function loadActor(base44, user): Promise<ActorDescriptor> {
  const seats = await base44.asServiceRole.entities.CommitteeMembership
    .filter({ user_email: user.email })
    .catch(() => []);
  return {
    kind: 'user',
    user_id: user.id,
    email: user.email,
    active_org_id: user.data?.active_org_id,
    platform_role: user.role,
    memberships: (seats || []).map((m: any) => ({
      committee_id: m.committee_id,
      role: m.role,
      status: m.status,
      user_id: m.user_id,
      user_email: m.user_email,
    })),
  };
}

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const entityType = typeof body.entity_type === 'string' ? body.entity_type.slice(0, 60) : '';
  const entityId = typeof body.entity_id === 'string' ? body.entity_id.slice(0, 120) : '';
  const action = ACTIONS.includes(body.action) ? body.action : 'preview';
  const purpose = typeof body.purpose === 'string' ? body.purpose.slice(0, 240) : '';
  const correlationId = `corr_${Math.random().toString(36).slice(2, 12)}`;

  if (!entityType || !entityId) {
    return Response.json({ error: 'entity_type and entity_id are required' }, { status: 400 });
  }

  // 1. Authentication.
  const user = await base44.auth.me().catch(() => null);
  const actor = await loadActor(base44, user);

  // 2. Identify the record and its governed reference.
  const source = REF_SOURCES[entityType];
  const record = source ? await base44.asServiceRole.entities[entityType]?.get(entityId).catch(() => null) : null;
  let refField = source?.field;
  let refValue = record && refField ? record[refField] : undefined;

  // A draft attachment has no saved record yet. Only an audit row proving that THIS
  // actor uploaded THAT file makes it servable, so the client cannot name a stranger's file.
  let uploaderDraft = false;
  if (!source || !record) {
    const clientRef = typeof body.file_ref === 'string' ? body.file_ref.slice(0, 500).trim() : '';
    if (clientRef) {
      const refFingerprint = await fingerprintRef(clientRef);
      const proofs = await base44.asServiceRole.entities.AuditEvent
        .filter({ entity_id: `ref:${refFingerprint}`, actor_user_id: actor.user_id, action: 'file_upload' })
        .catch(() => []);
      if ((proofs || []).length > 0) {
        refField = refField || 'file_url';
        refValue = clientRef;
        uploaderDraft = true;
      }
    }
  }

  // 3. Evaluate.
  const verdict = evaluateAccess({
    actor,
    refField,
    refValue,
    record: uploaderDraft
      ? { organization_id: actor.active_org_id, committee_id: record?.committee_id, classification: 'internal' }
      : record,
    classification: source?.classificationField ? record?.[source.classificationField] : record?.classification,
    action,
    purpose,
  });
  if (uploaderDraft && verdict.decision === 'allow') verdict.reason = 'uploader_draft';

  const refFingerprint = await fingerprintRef(refValue);
  const baseAudit = {
    organization_id: record?.organization_id || actor.active_org_id || null,
    committee_id: record?.committee_id || null,
    entity_type: entityType,
    entity_id: entityId,
    entity_title: refField || 'file',
    actor_user_id: actor.user_id || null,
    actor_name: user?.full_name || null,
    actor_email: actor.email || null,
    correlation_id: correlationId,
    authority_context: record?.committee_id || null,
  };

  // 4. Decide — a refusal never reveals whether the file exists.
  if (verdict.decision === 'deny') {
    await recordAudit(base44, {
      ...baseAudit,
      action: 'file_access',
      old_value: verdict.reason,
      new_value: 'denied',
      description: `File ${action} denied (${verdict.reason}) ref:${refFingerprint || 'none'} ttl:none`,
    });
    const reason = ['unauthenticated'].includes(verdict.reason) ? verdict.reason : 'not_found_or_denied';
    return Response.json(
      { error: 'Access denied', reason, required_role: verdict.required_role || null, message: MESSAGE, correlation_id: correlationId },
      { status: verdict.reason === 'unauthenticated' ? 401 : 403 },
    );
  }

  // Not a governed file: an approved public asset, or a legacy public link that
  // must be migrated. Neither is served by this gate.
  if (verdict.decision === 'not_governed') {
    if (verdict.state === 'legacy_pending_migration') {
      await recordAudit(base44, {
        ...baseAudit,
        action: 'file_legacy_pending_migration',
        old_value: 'legacy_public_link',
        new_value: 'flagged',
        description: `Legacy public link detected on a sensitive field for ${entityType} ref:${refFingerprint}`,
      });
    }
    return Response.json({
      url: null,
      state: verdict.state,
      reason: verdict.reason,
      message: MESSAGE,
      correlation_id: correlationId,
    });
  }

  // 5. Allow — mint the short-lived link, and never persist it.
  let signedUrl = '';
  try {
    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: refValue,
      expires_in: LINK_TTL_SECONDS,
    });
    signedUrl = signed?.signed_url || '';
  } catch (error) {
    await recordAudit(base44, {
      ...baseAudit,
      action: 'file_access',
      old_value: 'sign_failed',
      new_value: 'denied',
      description: `File ${action} allowed by policy but signing failed ref:${refFingerprint} ttl:none`,
    });
    return Response.json({ error: 'Access denied', reason: 'not_found_or_denied', correlation_id: correlationId }, { status: 403 });
  }

  // 6. Record the event and the decision — no link, no token, no content.
  await recordAudit(base44, {
    ...baseAudit,
    action: 'file_access',
    old_value: verdict.reason,
    new_value: 'allowed',
    description: `File ${action} allowed (${verdict.reason}) ref:${refFingerprint} ttl:${LINK_TTL_SECONDS}s`,
  });

  return Response.json({
    url: signedUrl,
    expires_in: LINK_TTL_SECONDS,
    correlation_id: correlationId,
  });
}