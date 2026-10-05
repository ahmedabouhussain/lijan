import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  MEETING_LIFECYCLE_VERSION,
  AGENDA_STATE,
  MINUTES_STATE,
  AGENDA_TRANSITIONS,
  AGENDA_ARCHIVE,
  MINUTES_TRANSITIONS,
  MINUTES_EDITABLE_STATES,
  canAdvanceAgendaItem,
  canArchiveAgendaItem,
  canAdvanceMinutes,
  minutesEditable,
  agendaChain,
  minutesChain,
  agendaRefusal,
  archiveRefusal,
  minutesRefusal,
  minutesContentRefusal,
} from '../../shared/meetingLifecycle.ts';
import { sanitizeServerRichText, isEmptyRichText } from '../../shared/serverRichText.ts';

// TestMeetingLifecycle — read-only suite for the agenda-item and minutes chains (D-019, D-020, D-022,
// D-024).
//
// What it guards:
//   • an agenda stage is never written without a governed command, and PREPARING the agenda is a
//     different right from APPROVING an item (a single capability carrying both acts is the defect
//     this asserts against);
//   • an agenda item is WITHDRAWN, never deleted, and a withdrawn item is not withdrawn twice;
//   • minutes content is writable only while the minutes can still be corrected;
//   • the minutes steps that had no command now have one, each under its own right;
//   • the positive cycles are reachable: pending → in_discussion → decided, and
//     draft → in_review → approved → issued.
//
// NO writes, NO record reads: it asserts the contract and the text policy the commands consume. A
// deployment-level proof (an authenticated meeting walked end to end) is a different evidence class
// and is NOT claimed here.

export default async function(req) {
  const results = [];
  const check = (test_id, description, fn) => {
    let verdict = 'PASS';
    let detail = {};
    try {
      const out = fn();
      detail = out === true ? {} : out;
      if (!(out === true || out?.passed === true)) verdict = 'FAIL';
    } catch (e) {
      verdict = 'FAIL';
      detail = { error: e.message };
    }
    results.push({ test_id, description, verdict, detail });
  };

  try {
    createClientFromRequest(req);

    // ── Agenda item stages ──────────────────────────────────────────────────────────────────────
    check('AG-001', 'A PENDING item may begin discussion; a decided one may not', () => ({
      passed: canAdvanceAgendaItem(AGENDA_STATE.PENDING, 'begin_discussion') === true
        && canAdvanceAgendaItem(AGENDA_STATE.DECIDED, 'begin_discussion') === false,
    }));

    check('AG-002', 'Deciding is permitted from pending or in discussion, and from nowhere else', () => {
      const from = AGENDA_TRANSITIONS.decide.from;
      return {
        passed: from.includes(AGENDA_STATE.PENDING) && from.includes(AGENDA_STATE.IN_DISCUSSION)
          && !from.includes(AGENDA_STATE.DECIDED) && !from.includes(AGENDA_STATE.WITHDRAWN),
        from: [...from],
      };
    });

    check('AG-003', 'Deferring is permitted only while the item is live', () => ({
      passed: canAdvanceAgendaItem(AGENDA_STATE.IN_DISCUSSION, 'defer') === true
        && canAdvanceAgendaItem(AGENDA_STATE.DECIDED, 'defer') === false,
    }));

    check('AG-004', 'An item is WITHDRAWN, not deleted, and a withdrawn item is not withdrawn twice', () => {
      const archivable = AGENDA_ARCHIVE.from;
      return {
        passed: archivable.includes(AGENDA_STATE.PENDING) && archivable.includes(AGENDA_STATE.IN_DISCUSSION)
          && archivable.includes(AGENDA_STATE.DEFERRED)
          && canArchiveAgendaItem(AGENDA_STATE.WITHDRAWN) === false
          && canArchiveAgendaItem(AGENDA_STATE.DECIDED) === false,
        withdrawable_from: [...archivable],
        withdrawn_is_terminal: canArchiveAgendaItem(AGENDA_STATE.WITHDRAWN) === false,
      };
    });

    check('AG-005', 'PREPARING the agenda and APPROVING an item are different rights', () => {
      const prepareRights = new Set([
        AGENDA_TRANSITIONS.begin_discussion.capability,
        AGENDA_TRANSITIONS.defer.capability,
        AGENDA_ARCHIVE.capability,
      ]);
      const approveRight = AGENDA_TRANSITIONS.decide.capability;
      return {
        passed: prepareRights.size === 1 && !prepareRights.has(approveRight),
        prepare_right: [...prepareRights][0],
        approve_right: approveRight,
      };
    });

    check('AG-006', 'Every agenda stage is written by SOME command (no stage nothing produces)', () => {
      const chain = agendaChain();
      const written = new Set(chain.filter((c) => c.writable_by).map((c) => c.stage));
      const unreachable = chain.filter((c) => c.reachable && !written.has(c.stage)).map((c) => c.stage);
      return { passed: unreachable.length === 0, unreachable, chain };
    });

    check('AG-007', 'The agenda cycle pending → in_discussion → decided is reachable end to end', () => {
      const steps = [
        canAdvanceAgendaItem(AGENDA_STATE.PENDING, 'begin_discussion'),
        canAdvanceAgendaItem(AGENDA_TRANSITIONS.begin_discussion.to, 'decide'),
      ];
      return { passed: steps.every(Boolean), steps };
    });

    check('AG-008', 'An agenda-item refusal carries a code, both languages, and what IS permitted', () => {
      const r = agendaRefusal('decide', AGENDA_STATE.WITHDRAWN);
      const a = archiveRefusal(AGENDA_STATE.DECIDED);
      return {
        passed: !!r.code && !!r.message?.ar && !!r.message?.en && Array.isArray(r.permitted_from)
          && !!a.code && !!a.message?.ar && !!a.message?.en && Array.isArray(a.withdrawable_from),
        transition_refusal: r,
        archive_refusal: a,
      };
    });

    // ── Minutes states ──────────────────────────────────────────────────────────────────────────
    check('MI-001', 'A DRAFT may be sent for review, and minutes already in review may not again', () => ({
      passed: canAdvanceMinutes(MINUTES_STATE.DRAFT, 'submit_for_review') === true
        && canAdvanceMinutes(MINUTES_STATE.IN_REVIEW, 'submit_for_review') === false,
    }));

    check('MI-002', 'Issuance acts on APPROVED minutes only, under its own right', () => {
      const spec = MINUTES_TRANSITIONS.issue;
      return {
        passed: spec.from.length === 1 && spec.from[0] === MINUTES_STATE.APPROVED
          && spec.capability === 'minutes.issue'
          && spec.capability !== MINUTES_TRANSITIONS.submit_for_review.capability,
        from: [...spec.from],
        capability: spec.capability,
      };
    });

    check('MI-003', 'A DRAFT or IN-REVIEW minutes cannot be issued', () => ({
      passed: canAdvanceMinutes(MINUTES_STATE.DRAFT, 'issue') === false
        && canAdvanceMinutes(MINUTES_STATE.IN_REVIEW, 'issue') === false,
    }));

    check('MI-004', 'A correction is possible only after approval, and produces AMENDED', () => {
      const spec = MINUTES_TRANSITIONS.amend;
      return {
        passed: spec.from.includes(MINUTES_STATE.APPROVED) && spec.from.includes(MINUTES_STATE.ISSUED)
          && spec.to === MINUTES_STATE.AMENDED
          && canAdvanceMinutes(MINUTES_STATE.DRAFT, 'amend') === false,
        from: [...spec.from],
        to: spec.to,
      };
    });

    check('MI-005', 'Content is writable only while the minutes can still be corrected', () => {
      const refused = [MINUTES_STATE.APPROVED, MINUTES_STATE.ISSUED, MINUTES_STATE.AMENDED]
        .filter((s) => minutesEditable(s));
      return {
        passed: minutesEditable(MINUTES_STATE.DRAFT) && minutesEditable(MINUTES_STATE.IN_REVIEW)
          && refused.length === 0,
        editable_states: [...MINUTES_EDITABLE_STATES],
        wrongly_editable: refused,
      };
    });

    check('MI-006', 'Every minutes state is written by SOME command', () => {
      const chain = minutesChain();
      const written = new Set(chain.filter((c) => c.writable_by).map((c) => c.state));
      const unreachable = chain.filter((c) => c.reachable && !written.has(c.state)).map((c) => c.state);
      return { passed: unreachable.length === 0, unreachable, chain };
    });

    check('MI-007', 'The minutes cycle draft → in_review → approved → issued is reachable', () => {
      const steps = [
        canAdvanceMinutes(MINUTES_STATE.DRAFT, 'submit_for_review'),
        canAdvanceMinutes(MINUTES_TRANSITIONS.submit_for_review.to, 'issue') === false, // approval comes first
        canAdvanceMinutes(MINUTES_STATE.APPROVED, 'issue'),
      ];
      return { passed: steps[0] === true && steps[2] === true, steps };
    });

    check('MI-008', 'A minutes refusal carries a code, both languages, and the permitted states', () => {
      const r = minutesRefusal('issue', MINUTES_STATE.DRAFT);
      const c = minutesContentRefusal(MINUTES_STATE.ISSUED);
      return {
        passed: !!r.code && !!r.message?.ar && !!r.message?.en && Array.isArray(r.permitted_from)
          && !!c.code && !!c.message?.ar && !!c.message?.en && Array.isArray(c.editable_states),
        transition_refusal: r,
        content_refusal: c,
      };
    });

    // ── The text policy the preparation command applies server-side ─────────────────────────────
    check('MI-009', 'The server text policy strips markup, script bodies and entity escapes', () => {
      const dirty = '  <div>محضر الاجتماع<br/>بند <b>أول</b><script>alert(1)</script>&nbsp;&amp; ثاني</div>  ';
      const clean = sanitizeServerRichText(dirty);
      return {
        passed: clean === 'محضر الاجتماعبند أول & ثاني',
        clean,
        script_body_removed: !clean.includes('alert'),
        markup_removed: !clean.includes('<'),
      };
    });

    check('MI-010', 'Empty content is detected after the policy is applied, not before', () => ({
      passed: isEmptyRichText('<div><br/></div>') === true && isEmptyRichText('  ' ) === true
        && isEmptyRichText('<p>نص</p>') === false,
    }));

    check('MI-011', 'The meeting lifecycle contract version is pinned and named in every refusal', () => {
      const r = agendaRefusal('decide', 'x');
      const m = minutesRefusal('issue', 'x');
      return {
        passed: MEETING_LIFECYCLE_VERSION === 'meeting-lifecycle-1.0.0'
          && r.meeting_lifecycle_version === MEETING_LIFECYCLE_VERSION
          && m.meeting_lifecycle_version === MEETING_LIFECYCLE_VERSION,
        version: MEETING_LIFECYCLE_VERSION,
      };
    });

    const passed = results.filter((r) => r.verdict === 'PASS').length;
    const failed = results.length - passed;

    return Response.json({
      meeting_lifecycle_version: MEETING_LIFECYCLE_VERSION,
      suites: {
        meeting_lifecycle: { total: results.length, passed, failed, verdict: failed === 0 ? 'PASS' : 'FAIL' },
      },
      failures: results.filter((r) => r.verdict !== 'PASS'),
      writes_performed: 0,
      records_read: 0,
      scope_note: 'the contract and the text policy only — this suite does not exercise a handler, a meeting or a deployment',
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message, results }, { status: 500 });
  }
}