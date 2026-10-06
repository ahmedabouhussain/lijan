import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse, requestClaims } from '../../shared/commandGuard.ts';
import {
  GUEST_ACCESS_VERSION, MAX_GUEST_VALIDITY_DAYS, GUEST_HARD_DENIED,
  validateGuestInvitation, evaluateGuestAccess,
} from '../../shared/guestAccess.ts';

// InviteAgendaItemGuest — governed item-level guest invitation (invite | revoke).
//
// Authority: `agenda.edit` on the AGENDA ITEM (the trusted target; its parent chain reaches the
// meeting and the committee). A guest invitation is part of preparing the meeting material, so it
// carries the preparation right — never a distribution or approval right.
//
// The guard is NOT modified for this act: both operations target an AgendaItem, and a revocation
// verifies the guest record's own committee against the derived scope before writing.
//
// No email is sent: a guest is not an app user, and reaching a non-user address needs plan, domain
// and screening authority this build does not hold. The invitation link is returned to the inviter
// to hand over, and the record carries the truth of that.

function makeToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "gst_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const claims = requestClaims(body);
    const action = body.action === "revoke" ? "revoke" : "invite";

    // ── revoke: the target is still the agenda item; the guest record is verified against the scope ──
    if (action === "revoke") {
      if (!body.guest_id) return Response.json({ error: "guest_id is required" }, { status: 400 });
      const guestRows = await sr.entities.AgendaItemGuest.filter({ id: body.guest_id }).catch(() => []);
      const guest = (Array.isArray(guestRows) ? guestRows : guestRows?.items || [])[0];
      if (!guest) return Response.json({ error: "Guest invitation not found", code: "guest_not_found" }, { status: 404 });

      const auth = await authorizeCommand(base44, {
        capability: "agenda.edit",
        target_type: "AgendaItem",
        target_id: guest.agenda_item_id,
        mode: "existing",
        claimed_committee_id: claims.claimed_committee_id,
      });
      if (!auth.allowed) return refusalResponse(auth);

      // The guest must belong to the scope the guard DERIVED — never to a scope the request named.
      if (guest.committee_id !== auth.trusted_target.derived_committee_id) {
        return Response.json({ error: "This guest invitation is outside the derived committee scope", code: "scope_mismatch" }, { status: 403 });
      }

      const updated = await sr.entities.AgendaItemGuest.update(guest.id, {
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by_user_id: auth.user.id,
        revoke_reason: body.reason || null,
      });

      await sr.entities.AuditEvent.create({
        organization_id: guest.organization_id, committee_id: guest.committee_id,
        actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
        action: "guest.revoke", entity_type: "AgendaItemGuest", entity_id: guest.id,
        entity_title: guest.guest_name,
        description: `Revoked guest access for ${guest.guest_name} on agenda item ${guest.agenda_item_id}`,
        correlation_id: auth.correlation_id, authority_context: auth.authority_context,
      }).catch(() => null);

      return Response.json({
        status: "ok", action: "revoke", guest: updated, contract_version: GUEST_ACCESS_VERSION,
        correlation_id: auth.correlation_id,
        recall_limit: { ar: "الإلغاء يمنع القراءة الجديدة ولا يسحب ما نُزِّل سابقًا.", en: "Revocation stops new reads; it does not recall material already downloaded." },
      });
    }

    // ── invite ──
    const validation = validateGuestInvitation({ guest_name: body.guest_name, expires_at: body.expires_at });
    if (!validation.valid) return Response.json({ error: validation.errors[0].en, error_ar: validation.errors[0].ar, code: validation.errors[0].code, errors: validation.errors }, { status: 400 });
    if (!body.agenda_item_id) return Response.json({ error: "agenda_item_id is required" }, { status: 400 });

    const listedIds = [...new Set((body.permitted_document_ids || []).filter((x) => typeof x === "string" && x))];

    const auth = await authorizeCommand(base44, {
      capability: "agenda.edit",
      target_type: "AgendaItem",
      target_id: body.agenda_item_id,
      mode: "create",
      // Every named attachment must live inside the SAME committee as the item (related scope check).
      related: listedIds.length ? [{ type: "Document", ids: listedIds }] : [],
      claimed_committee_id: claims.claimed_committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    // Hard denials are refused at invitation time, so the inviter never believes they shared less
    // than they did: minutes and restricted material can never be listed for a guest.
    if (listedIds.length) {
      const docRows = await sr.entities.Document.filter({ id: { $in: listedIds } }, { limit: 200 }).catch(() => []);
      const docs = Array.isArray(docRows) ? docRows : (docRows?.items || []);
      const blocked = docs.filter((d) => GUEST_HARD_DENIED.document_types.includes(d.document_type) || GUEST_HARD_DENIED.classifications.includes(d.classification));
      if (blocked.length) {
        return Response.json({
          error: "Minutes and restricted material can never be shared with a guest",
          error_ar: "لا يمكن مشاركة المحاضر أو المواد المقيَّدة مع ضيف",
          code: "hard_denied_attachment",
          blocked: blocked.map((d) => ({ id: d.id, title: d.title_ar || d.title, document_type: d.document_type, classification: d.classification })),
        }, { status: 409 });
      }
    }

    const nowIso = new Date().toISOString();
    const guest = await sr.entities.AgendaItemGuest.create({
      organization_id: auth.organization_id,
      committee_id: auth.trusted_target.derived_committee_id,
      meeting_id: auth.target?.meeting_id || null,
      agenda_item_id: body.agenda_item_id,
      guest_name: body.guest_name,
      guest_name_en: body.guest_name_en || null,
      guest_email: body.guest_email || null,
      guest_organization: body.guest_organization || null,
      purpose: body.purpose || null,
      access_token: makeToken(),
      access_scope: "item_only",
      permitted_document_ids: listedIds,
      valid_from: body.valid_from || null,
      expires_at: body.expires_at,
      status: "active",
      invited_by_user_id: auth.user.id,
      invited_by_name: auth.user.full_name || auth.user.email,
      invited_at: nowIso,
      view_count: 0,
      contract_version: GUEST_ACCESS_VERSION,
      data_origin: "operational",
    });

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: guest.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: "guest.invite", entity_type: "AgendaItemGuest", entity_id: guest.id,
      entity_title: guest.guest_name,
      description: `Invited ${guest.guest_name} to agenda item ${guest.agenda_item_id} until ${guest.expires_at} (item-scoped, ${listedIds.length} permitted attachment(s))`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    }).catch(() => null);

    return Response.json({
      status: "ok", action: "invite", guest,
      contract_version: GUEST_ACCESS_VERSION,
      max_validity_days: MAX_GUEST_VALIDITY_DAYS,
      // Shown ONCE to the inviter, who hands it over. It is a capability, not an account.
      invite_link: `/guest/${guest.access_token}`,
      delivery: {
        email_sent: false,
        code: "guest_email_not_sent",
        reason_ar: "لا يُرسل بريد إلى ضيف غير مسجَّل من هذا البناء: يتطلب نطاقًا بريديًا وخطة وصلاحية إرسال غير متوفرة/غير مصرَّح بها. يُسلَّم الرابط يدويًا.",
        reason_en: "No email is sent to a non-registered guest from this build: it requires a custom email domain, a paid plan and send authority that is not available or not authorized. The link is handed over manually.",
      },
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}