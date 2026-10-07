import {
  EXCEPTIONS, EXCEPTION_CLASSES, EXCEPTION_RESOLUTIONS, DECLARED_GAPS, DERIVED_SOURCES,
  EXCEPTION_CATALOGUE_VERSION, findException, catalogueSummary, auditCatalogue,
} from '../../shared/exceptionCatalogue.ts';

// TestExceptionCatalogue — المادة و: هل يصلح سجل الاستثناءات أن يكون مرجعًا؟
//
// It proves: every exception declares its class, its emitting contract, whether the act stops, who
// resolves it, what it says in both languages, and what must NEVER be assumed while it stands. It
// proves the register cannot drift from the one source it derives from, and that a derived source
// yielding nothing is reported as UNREAD rather than as completeness. And it proves the register is
// honest about its own limits: what it does not cover is named, and an unknown code is answered as
// unknown rather than with a default.
//
// Scope note (declared): pure policy over the register. No record is read and none is written, so this
// does not prove that any of these exceptions was raised inside a live governed journey — the seated
// actor blocker (D-064) still governs that.

export default async function (req) {
  const results: any[] = [];
  const check = (id: string, label: string, pass: any, detail: any = null) =>
    results.push({ id, label, pass: !!pass, detail });

  const audit = auditCatalogue();

  check('EC-001', 'the catalogue declares its own version', EXCEPTION_CATALOGUE_VERSION === 'exception-catalogue-1.0.0', EXCEPTION_CATALOGUE_VERSION);

  check('EC-002', 'EVERY exception is complete: class, contract, emitting command, stop semantics, resolution, both languages, and a "never assume"',
    EXCEPTIONS.length > 0 && EXCEPTIONS.every((e: any) =>
      !!EXCEPTION_CLASSES[e.class] && !!e.contract && !!e.emitted_by
      && ['act', 'affected_only', 'read'].includes(e.stops)
      && !!EXCEPTION_RESOLUTIONS[e.resolution]
      && !!e.ar && !!e.en && !!e.never_assume_ar && !!e.never_assume_en),
    { total: EXCEPTIONS.length, summary: catalogueSummary() });

  check('EC-003', 'the register passes its OWN check: no duplicate, no undeclared class or resolution, no silent stop',
    audit.ok === true && audit.findings.length === 0, audit.findings);

  check('EC-004', 'NO exception resolves itself: resolution is the owner, a seated actor, a policy record, a correction record, a new round, identity binding or an external read',
    EXCEPTIONS.every((e: any) => e.resolution !== 'self' && !!EXCEPTION_RESOLUTIONS[e.resolution]),
    [...new Set(EXCEPTIONS.map((e: any) => e.resolution))]);

  check('EC-005', 'every exception says WHAT STOPS: the act, only the affected official act, or the read',
    EXCEPTIONS.every((e: any) => ['act', 'affected_only', 'read'].includes(e.stops))
    && EXCEPTIONS.some((e: any) => e.stops === 'affected_only')
    && EXCEPTIONS.some((e: any) => e.stops === 'read'),
    EXCEPTIONS.reduce((acc: any, e: any) => ({ ...acc, [e.stops]: (acc[e.stops] || 0) + 1 }), {}));

  check('EC-006', 'the register DERIVES from a real source at runtime and reports it: codes read, and a source that yielded nothing is UNREAD not complete',
    DERIVED_SOURCES.length > 0 && audit.derived.every((d: any) => !!d.module && !!d.version)
    && audit.derived.some((d: any) => d.codes_read > 0 && d.unreadable === false)
    && audit.derived.every((d: any) => d.unreadable !== true),
    audit.derived);

  check('EC-007', 'EVERY code of that derived source appears in the catalogue — the register cannot drift from the guard it depends on',
    audit.derived_missing_from_catalogue.length === 0, audit.derived_missing_from_catalogue);

  check('EC-008', 'an unknown code is answered as UNKNOWN, never with a silent default',
    [...new Set(EXCEPTIONS.map((e: any) => e.code))].every((c: string) => Array.isArray(findException(c)) && findException(c)!.length > 0)
    && findException('no_such_code_at_all') === null,
    findException('no_such_code_at_all'));

  check('EC-009', 'a code emitted by more than one contract is declared as shared rather than assumed unique',
    audit.shared_codes.every((c: string) => EXCEPTIONS.filter((e: any) => e.code === c).length > 1)
    && EXCEPTIONS.filter((e: any) => e.code === 'token_unknown').length >= 2,
    audit.shared_codes);

  check('EC-010', 'what the register does NOT cover is NAMED (no completeness it does not hold)',
    DECLARED_GAPS.length > 0 && DECLARED_GAPS.every((g: any) => !!g.ar && !!g.en),
    DECLARED_GAPS.length);

  check('EC-011', 'integrity failures are declared as integrity failures: a mismatch is read "unverified", never "sound"',
    ['frozen_content_tampered', 'hold_state_unverifiable', 'unbound_legacy_package', 'channel_unavailable'].every((c) => !!findException(c))
    && EXCEPTIONS.some((e: any) => e.class === 'integrity' && /غير متحقق|unverified/i.test(`${e.ar} ${e.en} ${e.never_assume_ar} ${e.never_assume_en}`)),
    EXCEPTIONS.filter((e: any) => e.class === 'integrity').map((e: any) => e.code));

  check('EC-012', 'the two hardest silent assumptions are declared explicitly: silence is not approval, an unread source is not an absence',
    EXCEPTIONS.some((e: any) => /الصمت ليس موافقة|Silence is not approval/.test(`${e.never_assume_ar} ${e.never_assume_en}`))
    && EXCEPTIONS.some((e: any) => /فشل|failed|يُقرأ/.test(`${e.never_assume_ar} ${e.never_assume_en}`)),
    null);

  check('EC-013', 'the register mixes observed and read bases, and reports how each entry was established',
    EXCEPTIONS.some((e: any) => e.basis === 'observed_live') && EXCEPTIONS.some((e: any) => e.basis === 'read_in_source')
    && audit.summary.by_basis.observed_live > 0 && audit.summary.by_basis.read_in_source > 0,
    audit.summary.by_basis);

  check('EC-014', 'the register states that it DECLARES and never decides or stops an act',
    !!audit.note_ar && !!audit.note_en && /لا يحلّ|resolves no exception/.test(`${audit.note_ar} ${audit.note_en}`),
    audit.note_en);

  check('EC-015', 'no DEAD class and no PHANTOM resolution: every declared class and every declared resolution is used by at least one exception',
    Object.keys(EXCEPTION_CLASSES).every((c) => EXCEPTIONS.some((e: any) => e.class === c))
    && Object.keys(EXCEPTION_RESOLUTIONS).every((r) => EXCEPTIONS.some((e: any) => e.resolution === r)),
    {
      classes_used: [...new Set(EXCEPTIONS.map((e: any) => e.class))].length, classes_declared: Object.keys(EXCEPTION_CLASSES).length,
      resolutions_used: [...new Set(EXCEPTIONS.map((e: any) => e.resolution))].length, resolutions_declared: Object.keys(EXCEPTION_RESOLUTIONS).length,
    });

  check('EC-016', 'the register derives from THREE compared sources, and every one of their codes is covered — a code cannot change in its contract without this register noticing',
    DERIVED_SOURCES.length === 3
    && audit.derived.length === 3
    && audit.derived.every((d: any) => d.codes_read > 0)
    && audit.derived_missing_from_catalogue.length === 0,
    audit.derived);

  const failed = results.filter((r) => !r.pass);
  return Response.json({
    suite: 'TestExceptionCatalogue',
    contract_version: EXCEPTION_CATALOGUE_VERSION,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    verdict: failed.length === 0 ? 'PASS' : 'FAIL',
    failures: failed,
    writes_performed: 0,
    records_read: 0,
    scope_note:
      'Proves the exception register (exception-catalogue-1.0.0) as a reference: completeness of every entry, no self-resolving exception, declared stop semantics, a real derived source that cannot drift, unknown codes answered as unknown, and declared gaps. It reads no record and writes none; it does not prove that any of these exceptions was raised inside a live governed journey (seated-actor blocker D-064).',
    results,
  });
}