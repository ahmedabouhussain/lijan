import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { evaluateGuestAccess, buildGuestExtract, GUEST_ACCESS_VERSION, GUEST_SCOPE } from '../../shared/guestAccess.ts';

// GetGuestItemView — the PUBLIC guest view of ONE agenda item.
//
// There is no session here and no app role: the token is the whole capability. The function reads
// exactly what the contract permits, refuses an expired or revoked invitation with the contract's own
// wording, writes an audit row for every permitted read, and never names material the guest may not
// see (a refusal must not disclose that a document exists).
//
// It opens no file-bytes path: the app's file-access policy governs authenticated seats, and guest
// file delivery is reported as blocked rather than simulated.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return Response.json({ error: "A guest token is required", error_ar: "رابط الدعوة مطلوب", code: "token_required" }, { status: 400 });
    }

    const rows = await sr.entities.AgendaItemGuest.filter({ access_token: token }).catch(() => []);
    const guest = (Array.isArray(rows) ? rows : rows?.items || [])[0] || null;

    const access = evaluateGuestAccess({ guest });
    if (!access.allowed) {
      // Unknown token and revoked/expired token are distinguishable on purpose: the holder of a dead
      // link is told it is dead (a useful human answer), never what it used to contain.
      return Response.json({
        error: access.reason, error_ar: access.reason_ar, code: access.code,
        contract_version: GUEST_ACCESS_VERSION,
      }, { status: access.code === "token_unknown" ? 404 : 410 });
    }

    const item = await sr.entities.AgendaItem.get(guest.agenda_item_id).catch(() => null);
    if (!item) {
      return Response.json({ error: "The named item is not available now", error_ar: "البند المُسمّى غير متاح الآن", code: "item_unavailable" }, { status: 410 });
    }
    const meeting = guest.meeting_id ? await sr.entities.Meeting.get(guest.meeting_id).catch(() => null) : null;
    const committee = await sr.entities.Committee.get(guest.committee_id).catch(() => null);
    const organization = committee?.organization_id ? await sr.entities.Organization.get(committee.organization_id).catch(() => null) : null;

    const listed = guest.permitted_document_ids || [];
    const docRows = listed.length ? await sr.entities.Document.filter({ id: { $in: listed } }, { limit: 200 }).catch(() => []) : [];
    const documents = Array.isArray(docRows) ? docRows : (docRows?.items || []);

    const extract = buildGuestExtract({ guest, item, meeting, committee, organization, documents });

    // The read is recorded (the guest view has no session, so the record is the only trail).
    await sr.entities.AgendaItemGuest.update(guest.id, {
      last_viewed_at: new Date().toISOString(),
      view_count: (guest.view_count || 0) + 1,
    }).catch(() => null);
    await sr.entities.AuditEvent.create({
      organization_id: guest.organization_id, committee_id: guest.committee_id,
      actor_user_id: null, actor_name: guest.guest_name, actor_email: guest.guest_email || null,
      action: "guest.view", entity_type: "AgendaItemGuest", entity_id: guest.id,
      entity_title: guest.guest_name,
      description: `Guest read the item-scoped view of agenda item ${guest.agenda_item_id} (link token)`,
      authority_context: `guest:item_only:${GUEST_ACCESS_VERSION}`,
    }).catch(() => null);

    return Response.json({ status: "ok", contract_version: GUEST_ACCESS_VERSION, view: extract, scope_statement: GUEST_SCOPE });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}