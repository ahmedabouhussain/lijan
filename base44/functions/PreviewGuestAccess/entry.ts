import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { buildGuestPreview, evaluateGuestAccess, GUEST_ACCESS_VERSION, GUEST_SCOPE } from '../../shared/guestAccess.ts';

// PreviewGuestAccess — the RECIPIENT PREVIEW for item-level guests.
//
// Two authorized reads on the SAME trusted target (the agenda item):
//   { agenda_item_id }  → the guests of that item, each with its live state and its hand-over link
//   { guest_id }        → exactly what that guest will receive, and what is withheld from them
//
// Read-only. Seeing what a guest receives is committee material in itself (it names withheld
// documents), so both modes pass the guard; nothing is returned before authorization.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};

    if (!body.guest_id && !body.agenda_item_id) {
      return Response.json({ error: "guest_id or agenda_item_id is required" }, { status: 400 });
    }

    // ── Mode A: the item's guest list ──
    if (!body.guest_id) {
      const auth = await authorizeCommand(base44, {
        capability: "read",
        target_type: "AgendaItem",
        target_id: body.agenda_item_id,
        mode: "existing",
        claimed_committee_id: body.committee_id || null,
      });
      if (!auth.allowed) return refusalResponse(auth);

      const rows = await sr.entities.AgendaItemGuest.filter({ agenda_item_id: body.agenda_item_id }).catch(() => null);
      if (rows === null) {
        // A failed read is never an empty guest list.
        return Response.json({ status: "ok", contract_version: GUEST_ACCESS_VERSION, guests: null, unread: [{ source: "AgendaItemGuest", reason: "the guest list could not be read" }] });
      }
      const list = (Array.isArray(rows) ? rows : rows?.items || []).filter((g) => g.committee_id === auth.trusted_target.derived_committee_id);
      const now = new Date();
      return Response.json({
        status: "ok",
        contract_version: GUEST_ACCESS_VERSION,
        scope_statement: GUEST_SCOPE,
        guests: list.map((g) => {
          const access = evaluateGuestAccess({ guest: g, now });
          return {
            id: g.id, name: g.guest_name, name_en: g.guest_name_en, organization: g.guest_organization,
            purpose: g.purpose, status: g.status, state: access.state, allowed: access.allowed,
            reason_ar: access.reason_ar, reason_en: access.reason_en,
            expires_at: g.expires_at || null, valid_from: g.valid_from || null,
            permitted_count: (g.permitted_document_ids || []).length,
            invited_by_name: g.invited_by_name || null, invited_at: g.invited_at || null,
            view_count: g.view_count || 0, last_viewed_at: g.last_viewed_at || null,
            // The link is a capability handed over by the secretariat; it is shown here only to an
            // actor the guard authorized on this item.
            link: access.allowed && g.access_token ? `/guest/${g.access_token}` : null,
          };
        }),
      });
    }

    // ── Mode B: one guest's exact payload ──
    const guestRows = await sr.entities.AgendaItemGuest.filter({ id: body.guest_id }).catch(() => []);
    const guest = (Array.isArray(guestRows) ? guestRows : guestRows?.items || [])[0] || null;
    if (!guest) return Response.json({ error: "Guest invitation not found", code: "guest_not_found" }, { status: 404 });

    const auth = await authorizeCommand(base44, {
      capability: "read",
      target_type: "AgendaItem",
      target_id: guest.agenda_item_id,
      mode: "existing",
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);
    if (guest.committee_id !== auth.trusted_target.derived_committee_id) {
      return Response.json({ error: "This guest invitation is outside the derived committee scope", code: "scope_mismatch" }, { status: 403 });
    }

    const item = auth.target;
    const meeting = guest.meeting_id ? await sr.entities.Meeting.get(guest.meeting_id).catch(() => null) : null;
    const organization = auth.organization_id ? await sr.entities.Organization.get(auth.organization_id).catch(() => null) : null;
    const listed = guest.permitted_document_ids || [];
    const docRows = listed.length ? await sr.entities.Document.filter({ id: { $in: listed } }, { limit: 200 }).catch(() => []) : [];
    const documents = Array.isArray(docRows) ? docRows : (docRows?.items || []);

    return Response.json({
      status: "ok",
      contract_version: GUEST_ACCESS_VERSION,
      preview: buildGuestPreview({ guest, item, meeting, committee: auth.committee || null, organization, documents }),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}