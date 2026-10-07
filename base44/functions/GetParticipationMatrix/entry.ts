import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  PARTICIPATION_MATRIX_VERSION, PARTICIPATION_RIGHTS, PARTICIPANT_KINDS, RIGHTS_SEPARATIONS,
  PRESENCE_STATES, PRESENCE_DECLARATIONS, evaluateParticipant, assertMatrixIntegrity,
} from '../../shared/participationMatrix.ts';

// The options form of filter/list returns a PAGE ({items, …}), never an array. Normalised once here so
// no route can iterate a page object as if it were its rows.
const asArray = (v: any) => (Array.isArray(v) ? v : (v && Array.isArray(v.items) ? v.items : []));

// GetParticipationMatrix — القراءة المحكومة وراء سطح المشاركة (الموجز §4B).
//
// It answers, on ONE committee, from records and without a write: who participates, in WHICH capacity,
// with which of the sixteen rights, and — for every right withheld — the code and the sentence that say
// why. Quorum is deliberately absent: it is computed from the frozen electorate, never from this matrix.
// A source that could not be read is NAMED, never reported as "no participants".
export default async function (req: any) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { committee_id, meeting_id } = body;
    if (!committee_id) return Response.json({ error: 'committee_id is required' }, { status: 400 });

    const auth = await authorizeCommand(base44, {
      capability: 'read',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const unread: string[] = [];
    const seats = await sr.entities.CommitteeMembership
      .filter({ committee_id }, { limit: 200 })
      .then(asArray)
      .catch(() => { unread.push('CommitteeMembership (المقاعد)'); return null; });
    const recusals = asArray(await sr.entities.Recusal
      .filter({ committee_id, status: 'active' }, { limit: 200 })
      .catch(() => { unread.push('Recusal (سجل التنحّي)'); return []; }));
    const guests = await sr.entities.AgendaItemGuest
      .filter({ committee_id }, { limit: 200 })
      .then(asArray)
      .catch(() => { unread.push('AgendaItemGuest (الضيوف)'); return null; });
    const activations = asArray(await sr.entities.AlternateActivation
      .filter({ committee_id }, { limit: 200 })
      .catch(() => { unread.push('AlternateActivation (تفعيل البدلاء)'); return []; }));
    const presence = meeting_id
      ? await sr.entities.Attendance
        .filter({ meeting_id }, { limit: 500 })
        .then(asArray)
        .catch(() => { unread.push('Attendance (سجل الحضور)'); return null; })
      : [];

    const recusalByUser = new Map(recusals.map((r: any) => [r.member_user_id, r]));
    const presenceByUser = new Map(asArray(presence).map((a: any) => [a.user_id || a.member_user_id || a.member_name, a]));
    const activationBySeat = new Map(activations.map((a: any) => [a.seat_id || a.membership_id, a]));

    // Kind is DERIVED from a canonical record here and the row says so; explicit recorded
    // configuration per participant is a declared next slice, never implied.
    const kindOf = (seat: any) => {
      if (seat.role === 'observer') return 'observer';
      if (seat.role === 'advisor') return 'invited_expert';
      if (seat.role === 'committee_administrator') return 'secretariat_support';
      if (seat.role === 'alternate') return 'alternate';
      if (seat.voting_right === false) return 'non_voting_member';
      return 'voting_member';
    };

    const participants = seats === null ? null : seats.map((seat: any) => {
      const kind = kindOf(seat);
      const evaluation = evaluateParticipant({
        kind,
        kind_source: 'derived_from_record',
        recusal: recusalByUser.get(seat.user_id) ? { active: true } : { active: false },
        alternate: activationBySeat.get(seat.id) || undefined,
        presence: (presenceByUser.get(seat.user_id) || {}) as any,
      });
      return {
        seat_id: seat.id,
        user_id: seat.user_id || null,
        name_ar: seat.full_name_ar || seat.full_name || null,
        name_en: seat.full_name || seat.full_name_ar || null,
        role: seat.role,
        voting_right: seat.voting_right !== false,
        seat_status: seat.status,
        capacity: null,
        kind,
        kind_source: evaluation.kind_source,
        kind_label_ar: (PARTICIPANT_KINDS as any)[kind]?.ar || null,
        kind_label_en: (PARTICIPANT_KINDS as any)[kind]?.en || null,
        rights: evaluation.rights,
        withheld: evaluation.withheld,
        findings: evaluation.findings,
        presence_state: evaluation.presence_state,
      };
    });

    const guestRows = guests === null ? null : guests.map((g: any) => {
      const windowClosed = g.status === 'expired' || g.status === 'revoked' || (g.expires_at && new Date(g.expires_at).getTime() < Date.now());
      const evaluation = evaluateParticipant({
        kind: 'invited_guest',
        kind_source: 'derived_from_record',
        guest: { item_id: g.agenda_item_id, status: g.status, window_closed: !!windowClosed },
      });
      return {
        grant_id: g.id,
        agenda_item_id: g.agenda_item_id,
        name_ar: g.guest_name || null,
        name_en: g.guest_name_en || g.guest_name || null,
        organization: g.guest_organization || null,
        purpose: g.purpose || null,
        scope: g.access_scope || 'item_only',
        status: g.status,
        expires_at: g.expires_at || null,
        window_closed: !!windowClosed,
        kind: 'invited_guest',
        kind_source: evaluation.kind_source,
        rights: evaluation.rights,
        withheld: evaluation.withheld,
        findings: evaluation.findings,
        presence_state: evaluation.presence_state,
      };
    });

    return Response.json({
      status: 'ok',
      contract_version: PARTICIPATION_MATRIX_VERSION,
      committee_id,
      meeting_id: meeting_id || null,
      matrix: {
        rights: PARTICIPATION_RIGHTS,
        kinds: PARTICIPANT_KINDS,
        separations: RIGHTS_SEPARATIONS,
        presence_states: PRESENCE_STATES,
        declarations: PRESENCE_DECLARATIONS,
        integrity: assertMatrixIntegrity(),
      },
      participants: participants || [],
      guests: guestRows || [],
      counts: {
        seats: seats === null ? null : seats.length,
        participants: participants ? participants.length : null,
        guests: guestRows ? guestRows.length : null,
        with_withheld_rights: participants ? participants.filter((p: any) => p.withheld.length > 0).length + guestRows.filter((g: any) => g.withheld.length > 0).length : null,
      },
      declared_limits: {
        recorded_configuration_ar: 'الحقوق مشتقّة اليوم من سجلات قائمة (المقعد · البديل · التنحّي · نافذة الضيف). وتسجيل الحقوق صراحةً لكل مشارك — بعقد تسجيل محكوم — هو الشريحة التالية، ولا يُدَّعى أنه قائم.',
        recorded_configuration_en: 'Rights are today DERIVED from existing records (the seat, the alternate, the recusal, the guest window). Recording per-participant rights explicitly — through a governed write contract — is the next slice and is not claimed here.',
        quorum_ar: 'النصاب لا يُحتسب من هذه المصفوفة: يُحتسب من الهيئة المجمّدة وحدها.',
        quorum_en: 'Quorum is never computed from this matrix: it is computed from the frozen electorate alone.',
      },
      unread_sources: unread,
      no_write: true,
      correlation_id: auth.correlation_id,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}