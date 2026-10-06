import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  EXTRACT_VERSION, EXTRACT_SCOPE, EXTRACT_SECTION_KEYS, MAX_NAME_LENGTH,
  deriveWindow, resolveSections, refusal,
} from '../../shared/executionExtract.ts';

// ShareActionExtract — the officer's act that opens ONE obligation to the party executing it.
//
// The act is governed: `action.admin` on a TRUSTED TARGET (the Action record itself), so the committee
// is derived from the record and a client-supplied scope is compared, never trusted. The link is the
// only capability the recipient holds: item-scoped, bounded in time, revocable, and the contract
// decides which sections may travel — a section outside the contract is REFUSED, not silently dropped.
//
// Sending is recorded honestly: this build has no mail path to a non-registered address, so the
// response says the link was NOT emailed and must be handed over by the secretariat.

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};

    // ── Revocation: the same right, on the grant itself ───────────────────────────────────────────
    if (body.revoke_grant_id) {
      const auth = await authorizeCommand(base44, {
        capability: 'action.admin',
        target_type: 'ActionExtractGrant',
        target_id: String(body.revoke_grant_id),
      });
      if (!auth.allowed) return refusalResponse(auth);
      const grant = auth.target;
      if (grant.status === 'revoked') {
        return Response.json({ status: 'ok', contract_version: EXTRACT_VERSION, grant: { id: grant.id, status: 'revoked' }, idempotent: true });
      }
      await sr.entities.ActionExtractGrant.update(grant.id, {
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by_user_id: auth.user.id,
        revoke_reason: String(body.revoke_reason || '').trim() || null,
      });
      await sr.entities.AuditEvent.create({
        organization_id: grant.organization_id, committee_id: grant.committee_id,
        actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
        action: 'action.extract_revoked', entity_type: 'ActionExtractGrant', entity_id: grant.id,
        entity_title: grant.recipient_name,
        description: `Execution-extract link revoked for action ${grant.action_id}`,
        authority_context: `capability:action.admin:${auth.policy_version}`,
        correlation_id: auth.correlation_id,
      }).catch(() => null);
      return Response.json({ status: 'ok', contract_version: EXTRACT_VERSION, grant: { id: grant.id, status: 'revoked' } });
    }

    // ── Issuing the link ─────────────────────────────────────────────────────────────────────────
    const actionId = typeof body.action_id === 'string' ? body.action_id : '';
    if (!actionId) return Response.json({ error: 'An obligation must be named', error_ar: 'يجب تسمية الالتزام', code: 'action_required' }, { status: 400 });

    const auth = await authorizeCommand(base44, {
      capability: 'action.admin',
      target_type: 'Action',
      target_id: actionId,
      claimed_committee_id: typeof body.committee_id === 'string' && body.committee_id ? body.committee_id : null,
    });
    if (!auth.allowed) return refusalResponse(auth);
    const action = auth.target;

    const name = String(body.recipient_name || '').trim();
    if (!name) { const r = refusal('recipient_required'); return Response.json({ error: r.reason, error_ar: r.reason_ar, code: r.code }, { status: r.status }); }
    if (name.length > MAX_NAME_LENGTH) { const r = refusal('recipient_too_long'); return Response.json({ error: r.reason, error_ar: r.reason_ar, code: r.code }, { status: r.status }); }

    const window_ = deriveWindow(body.expires_in_days);
    if (!window_.ok) return Response.json({ error: window_.reason, error_ar: window_.reason_ar, code: window_.code }, { status: window_.status });

    const sections = resolveSections(body.sections);
    if (!sections.ok) {
      // A requested section outside the contract is named and refused — the boundary is never softened.
      return Response.json({ error: sections.reason, error_ar: sections.reason_ar, code: sections.code, section: sections.section || null }, { status: sections.status });
    }
    const requested = Array.isArray(body.sections) ? body.sections.map(String) : [];
    const excludedRequest = requested.filter((s: string) => !EXTRACT_SECTION_KEYS.includes(s));

    const token = newToken();
    const now = new Date().toISOString();
    const grant = await sr.entities.ActionExtractGrant.create({
      organization_id: action.organization_id,
      committee_id: auth.trusted_target.derived_committee_id,
      action_id: action.id,
      decision_id: action.decision_id || null,
      recipient_name: name,
      recipient_name_en: String(body.recipient_name_en || '').trim() || null,
      recipient_organization: String(body.recipient_organization || '').trim() || null,
      recipient_organization_en: String(body.recipient_organization_en || '').trim() || null,
      recipient_email: String(body.recipient_email || '').trim() || null,
      purpose: String(body.purpose || '').trim() || null,
      access_token: token,
      access_scope: EXTRACT_SCOPE,
      permitted_sections: sections.sections,
      valid_from: body.valid_from || now,
      expires_at: window_.expires_at,
      status: 'sent',
      shared_by_user_id: auth.user.id,
      shared_by_name: auth.user.full_name || auth.user.email,
      shared_at: now,
      view_count: 0,
      contract_version: EXTRACT_VERSION,
      data_origin: 'operational',
      is_demo_data: false,
    });

    await sr.entities.AuditEvent.create({
      organization_id: action.organization_id, committee_id: grant.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'action.extract_shared', entity_type: 'ActionExtractGrant', entity_id: grant.id,
      entity_title: name,
      description: `Execution-extract link issued for action ${action.id} to ${name} (${window_.days} day(s))`,
      authority_context: `capability:action.admin:${auth.policy_version}`,
      correlation_id: auth.correlation_id,
    }).catch(() => null);

    return Response.json({
      status: 'ok',
      contract_version: EXTRACT_VERSION,
      grant: {
        id: grant.id, status: grant.status, expires_at: grant.expires_at,
        recipient_name: grant.recipient_name, permitted_sections: grant.permitted_sections,
      },
      // The link is returned ONCE, to the seat that issued it, so it can be handed over. It carries no
      // authority of its own beyond what the contract permits, and it is revocable from this same panel.
      link_path: `/extract/${token}`,
      delivery: {
        email_sent: false,
        reason_ar: 'لا يُرسل هذا البناء بريدًا إلى عنوان غير مسجَّل: يُسلَّم الرابط من الأمانة، وتُسجَّل كل قراءة في التدقيق.',
        reason_en: 'This build does not email an address that is not a registered user: the secretariat hands the link over, and every read is recorded in the audit trail.',
      },
      refused_requested_sections: excludedRequest,
      scope: { access_scope: EXTRACT_SCOPE, requested_sections: requested },
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: EXTRACT_VERSION }, { status: 500 });
  }
}