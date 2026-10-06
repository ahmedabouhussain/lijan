import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  INSTITUTIONAL_CHANGE_VERSION, CHANGE_KINDS, INVENTORY_SOURCES, CHANGE_DISPOSITIONS,
  assessChangeDisposition, proposeForChange, refusal,
} from '../../shared/institutionalChange.ts';

// RecordChangeDisposition — the committee's decision about ONE obligation before it changes, including
// placing and releasing a LEGAL HOLD.
//
// Governed: `committee.manage` on the COMMITTEE (the competent authority acts on the institution), with
// the disposition row handed to the guard as a RELATED record so it must share that committee. The
// disposition is judged by the contract, where the hold rules live: while a hold stands, no disposition
// that closes, transfers or expires the obligation is accepted, and releasing a hold requires its own
// reason and does not close anything.
//
// Nothing is written from the browser, and nothing is deleted: an obligation is dispositioned and its
// record stays on the file for audit.

function newCorrelation() {
  return 'corr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};

    const committeeId = typeof body.committee_id === 'string' ? body.committee_id : '';
    if (!committeeId) return Response.json({ error: 'A committee must be named', error_ar: 'يجب تسمية اللجنة', code: 'committee_required' }, { status: 400 });

    const changeKind = typeof body.change_kind === 'string' ? body.change_kind : '';
    if (!CHANGE_KINDS[changeKind]) {
      const r = refusal('change_kind_unknown', { change_kind: changeKind, supported: Object.keys(CHANGE_KINDS) });
      return Response.json({ error: r.reason, error_ar: r.reason_ar, code: r.code, supported: r.supported }, { status: r.status });
    }

    // The row being decided, when it already exists — carried to the guard as a RELATED record so its
    // committee must agree with the committee the act is taken on.
    const dispositionId = typeof body.disposition_id === 'string' && body.disposition_id ? body.disposition_id : null;
    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committeeId,
      related: dispositionId ? [{ type: 'ChangeDisposition', ids: [dispositionId] }] : [],
    });
    if (!auth.allowed) return refusalResponse(auth);
    const derived = auth.trusted_target.derived_committee_id;

    const correlation_id = newCorrelation();
    const now = new Date().toISOString();

    // ── Releasing a hold ──────────────────────────────────────────────────────────────────────────
    if (body.release_hold === true) {
      if (!dispositionId) return Response.json({ error: 'An existing hold must be named to release it', error_ar: 'يجب تسمية الحجز القائم لرفعه', code: 'disposition_required' }, { status: 400 });
      const row = await sr.entities.ChangeDisposition.get(dispositionId).catch(() => null);
      const verdict = assessChangeDisposition({
        obligation_type: row?.obligation_type, disposition: row?.disposition || 'legal_hold',
        legal_hold_active: row?.legal_hold === true && !row?.hold_released_at,
        release: true, release_reason: body.hold_release_reason,
      });
      if (!verdict.ok) return Response.json({ error: verdict.reason, error_ar: verdict.reason_ar, code: verdict.code }, { status: verdict.status });

      await sr.entities.ChangeDisposition.update(dispositionId, {
        hold_released_at: now,
        hold_released_by_user_id: auth.user.id,
        hold_released_by_name: auth.user.full_name || auth.user.email,
        hold_release_reason: verdict.release_reason,
        status: 'hold_released',
      });
      await sr.entities.AuditEvent.create({
        organization_id: auth.organization_id, committee_id: derived,
        actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
        action: 'change.hold_released', entity_type: 'ChangeDisposition', entity_id: dispositionId,
        entity_title: row?.title || null,
        description: `Legal hold released on ${row?.source_entity_type} ${row?.source_entity_id} (${changeKind})`,
        authority_context: `capability:committee.manage:${auth.policy_version}`,
        correlation_id,
      }).catch(() => null);

      return Response.json({
        status: 'ok', contract_version: INSTITUTIONAL_CHANGE_VERSION,
        effect: 'hold_released', closes_obligation: false,
        note: verdict.note, correlation_id,
      });
    }

    // ── Recording a disposition (including placing a hold) ────────────────────────────────────────
    const obligationType = typeof body.obligation_type === 'string' ? body.obligation_type : '';
    const disposition = typeof body.disposition === 'string' ? body.disposition : '';
    const existingRow = dispositionId ? await sr.entities.ChangeDisposition.get(dispositionId).catch(() => null) : null;
    const holdActive = existingRow ? (existingRow.legal_hold === true && !existingRow.hold_released_at) : false;

    if (!dispositionId && (!body.source_entity_id || !body.source_entity_type)) {
      const r = refusal('obligation_not_fully_described');
      return Response.json({ error: r.reason, error_ar: r.reason_ar, code: r.code }, { status: r.status });
    }

    const verdict = assessChangeDisposition({
      obligation_type: obligationType, disposition,
      legal_hold_active: holdActive,
      hold_reason: body.legal_hold_reason,
    });
    if (!verdict.ok) return Response.json({ error: verdict.reason, error_ar: verdict.reason_ar, code: verdict.code }, { status: verdict.status });

    const source = INVENTORY_SOURCES.find((s) => s.obligation_type === obligationType);
    const base = {
      organization_id: auth.organization_id,
      committee_id: derived,
      change_kind: changeKind,
      change_reference: String(body.change_reference || '').trim() || null,
      obligation_type: obligationType,
      source_entity_type: String(body.source_entity_type || existingRow?.source_entity_type || ''),
      source_entity_id: String(body.source_entity_id || existingRow?.source_entity_id || ''),
      title: String(body.title || existingRow?.title || `${source?.en || obligationType}`),
      due_date: body.due_date || existingRow?.due_date || null,
      source_status: body.source_status || existingRow?.source_status || null,
      proposed_disposition: proposeForChange(obligationType),
      disposition,
      legal_hold: disposition === 'legal_hold',
      legal_hold_reason: verdict.hold_reason,
      legal_hold_authority_user_id: disposition === 'legal_hold' ? auth.user.id : null,
      legal_hold_authority_name: disposition === 'legal_hold' ? (auth.user.full_name || auth.user.email) : null,
      legal_hold_at: disposition === 'legal_hold' ? now : null,
      decided_by_user_id: auth.user.id,
      decided_by_name: auth.user.full_name || auth.user.email,
      decided_capacity: auth.effective_role || auth.authority_context || null,
      decided_at: now,
      status: 'decided',
      contract_version: INSTITUTIONAL_CHANGE_VERSION,
      correlation_id,
      data_origin: 'operational',
      is_demo_data: false,
    };

    const saved = dispositionId
      ? await sr.entities.ChangeDisposition.update(dispositionId, base)
      : await sr.entities.ChangeDisposition.create(base);

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: derived,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: disposition === 'legal_hold' ? 'change.hold_placed' : 'change.disposition_recorded',
      entity_type: 'ChangeDisposition', entity_id: saved.id,
      entity_title: base.title,
      description: `${disposition} recorded for ${base.source_entity_type} ${base.source_entity_id} under change ${changeKind}${verdict.hold_reason ? ` — ${verdict.hold_reason}` : ''}`,
      authority_context: `capability:committee.manage:${auth.policy_version}`,
      correlation_id,
    }).catch(() => null);

    return Response.json({
      status: 'ok',
      contract_version: INSTITUTIONAL_CHANGE_VERSION,
      disposition: {
        id: saved.id, obligation_type: obligationType, disposition,
        legal_hold: base.legal_hold, legal_hold_reason: base.legal_hold_reason,
        decided_at: now, decided_by_capacity: base.decided_capacity,
      },
      effect: verdict.effect,
      closes_obligation: verdict.closes_obligation,
      needs_successor: verdict.needs_successor,
      hold_rules_applied: base.legal_hold ? {
        blocks_closure: true, blocks_transfer: true, blocks_expiry: true, blocks_deletion: true,
        lapses_by_itself: false,
      } : null,
      policy_version: auth.policy_version,
      correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: INSTITUTIONAL_CHANGE_VERSION }, { status: 500 });
  }
}