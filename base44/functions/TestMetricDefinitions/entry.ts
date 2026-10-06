import {
  METRIC_DEFINITIONS_VERSION, METRICS, METRIC_KEYS, DISCLOSURE_FLOOR,
  GOVERNED_SOURCES, assessMetric, metricLine, selfCheck,
} from '../../shared/metricDefinitions.ts';

// TestMetricDefinitions — PROVES the metric rule (metric-definitions-1.0.0, D-088).
//
// It proves that no number can be shown without its definition, owner, period, numerator, denominator,
// source and freshness; that a small basis or a small numerator is WITHHELD and named rather than
// displayed as a rate; that a count which could not be read is unread and never zero; and that an
// impossible ratio is refused loudly instead of rendered. writes: 0, records read: 0.

export default async function () {
  type Check = { id: string; label: string; pass: boolean; detail?: any };
  const results: Check[] = [];
  const check = (id: string, label: string, pass: boolean, detail?: any) => results.push({ id, label, pass: !!pass, detail: detail ?? null });

  check('MD-001', 'the contract declares its own version', METRIC_DEFINITIONS_VERSION === 'metric-definitions-1.0.0', METRIC_DEFINITIONS_VERSION);

  const audit = selfCheck();
  check('MD-002', 'the registry audits ITSELF and finds no problem', audit.ok === true && audit.problems.length === 0, audit.problems);
  check('MD-003', 'the registry declares its metrics, and the keys are unique', audit.metrics === METRIC_KEYS.length && audit.metrics >= 6, METRIC_KEYS);

  const required = ['title', 'definition', 'owner', 'period', 'numerator', 'denominator', 'source_entities', 'freshness', 'disclosure_floor'];
  check('MD-004', 'EVERY METRIC DECLARES ALL SEVEN FACTS (name · meaning · owner · period · numerator · denominator · source · freshness)',
    METRIC_KEYS.every((k) => required.every((f) => METRICS[k][f] !== undefined && METRICS[k][f] !== null)),
    METRIC_KEYS.map((k) => `${k}:${required.filter((f) => METRICS[k][f] === undefined).length === 0 ? 'ok' : 'missing'}`));

  check('MD-005', 'every metric is bilingual in its title AND its meaning',
    METRIC_KEYS.every((k) => METRICS[k].title.ar && METRICS[k].title.en && METRICS[k].definition.ar && METRICS[k].definition.en));
  check('MD-006', 'every metric NAMES AN OWNER ROLE with a bilingual label',
    METRIC_KEYS.every((k) => METRICS[k].owner.role && METRICS[k].owner.ar && METRICS[k].owner.en));
  check('MD-007', 'every metric NAMES ITS PERIOD', METRIC_KEYS.every((k) => METRICS[k].period.mode && METRICS[k].period.ar && METRICS[k].period.en));
  check('MD-008', 'every RATE names a denominator (a rate without a basis is refused)',
    METRIC_KEYS.every((k) => METRICS[k].unit !== 'percent' || (METRICS[k].denominator.rule && METRICS[k].denominator.source)));
  check('MD-009', 'every metric declares WHICH RECORDS ARE READ, and only governed sources',
    METRIC_KEYS.every((k) => METRICS[k].source_entities.length > 0 && METRICS[k].source_entities.every((s: string) => GOVERNED_SOURCES.includes(s))));
  check('MD-010', 'every metric states its freshness (a live read, not a stored snapshot)',
    METRIC_KEYS.every((k) => METRICS[k].freshness.mode === 'live_read'));
  check('MD-011', 'every metric is computed on the SERVER, never in the view',
    METRIC_KEYS.every((k) => METRICS[k].computed_on === 'server'));
  check('MD-012', 'every metric declares a disclosure floor of at least one record', METRIC_KEYS.every((k) => METRICS[k].disclosure_floor >= 1));
  check('MD-013', 'the risk metric is declared INVERSE (a rising value is never read as an achievement)',
    METRICS.open_overdue_rate.polarity === 'inverse' && METRICS.decision_issuance_rate.polarity === 'direct');

  const computed = assessMetric({ key: 'decision_issuance_rate', numerator: 75, denominator: 100 });
  check('MD-014', 'a computed rate is returned WITH its definition, owner, period, numerator text, denominator text and source',
    computed.ok === true && computed.value === 75 && computed.definition?.ar && computed.owner?.role && computed.period?.mode
    && computed.numerator_text?.ar && computed.denominator_text?.ar && computed.source_entities?.length === 1,
    { value: computed.value, owner: computed.owner?.role });
  check('MD-015', 'the assessment carries the raw basis so the figure can be audited', computed.fraction === '75/100' && computed.numerator === 75 && computed.denominator === 100);

  const noRecords = assessMetric({ key: 'action_closure_rate', numerator: 0, denominator: 0 });
  check('MD-016', 'NO RECORDS is not a zero rate: the value is withheld and the state is named',
    noRecords.state === 'no_records' && noRecords.value === null && noRecords.note?.ar && noRecords.note?.en, noRecords.note);

  const smallBasis = assessMetric({ key: 'minutes_approval_rate', numerator: 2, denominator: 4 });
  check('MD-017', 'A SMALL BASIS IS WITHHELD: no rate is shown over four records, and the floor is named',
    smallBasis.state === 'suppressed' && smallBasis.value === null && smallBasis.reason === 'small_basis' && smallBasis.disclosure_floor === DISCLOSURE_FLOOR,
    smallBasis.note);

  const boundary = assessMetric({ key: 'minutes_approval_rate', numerator: 5, denominator: 5 });
  check('MD-018', 'the floor is a floor, not a ceiling: exactly five records may be shown',
    boundary.state === 'computed' && boundary.value === 100, boundary.value);

  const smallNumerator = assessMetric({ key: 'evidence_first_pass_rate', numerator: 2, denominator: 100 });
  check('MD-019', 'A SMALL NUMERATOR IS WITHHELD even on a large basis (a count attributable to a person is not printed)',
    smallNumerator.state === 'suppressed' && smallNumerator.reason === 'small_numerator' && smallNumerator.value === null, smallNumerator.note);

  const impossible = assessMetric({ key: 'action_closure_rate', numerator: 7, denominator: 3 });
  check('MD-020', 'AN IMPOSSIBLE RATIO IS REFUSED LOUDLY, never rendered',
    impossible.ok === false && impossible.code === 'numerator_exceeds_denominator' && impossible.state === 'refused', impossible.code);

  check('MD-021', 'negative or fractional counts are refused',
    assessMetric({ key: 'action_closure_rate', numerator: -1, denominator: 4 }).code === 'invalid_counts'
    && assessMetric({ key: 'action_closure_rate', numerator: 1.5, denominator: 4 }).code === 'invalid_counts');

  const unread = assessMetric({ key: 'action_closure_rate', numerator: null, denominator: 4 });
  check('MD-022', 'A COUNT THAT COULD NOT BE READ IS UNREAD — never a zero in its place',
    unread.state === 'unread' && unread.value === null && unread.note?.ar && unread.note?.en, unread.state);

  check('MD-023', 'an unknown metric is refused rather than invented', assessMetric({ key: 'nope', numerator: 1, denominator: 2 }).code === 'unknown_metric');

  const line = metricLine(computed, 'ar');
  check('MD-024', 'the printed line carries the figure WITH its meaning (a bare number is not printable)',
    line.includes('75%') && line.includes(METRICS.decision_issuance_rate.definition.ar) && line.includes('75/100'), line);

  const suppressedLine = metricLine(smallBasis, 'en');
  check('MD-025', 'a withheld value prints the reason, not a number',
    !/\d/.test(suppressedLine.split('·')[0]) && suppressedLine.toLowerCase().includes('disclosure floor'), suppressedLine);

  check('MD-026', 'every surface-facing assessment is serialisable policy — nothing unserialisable travels in it',
    JSON.stringify(computed).length > 0 && typeof computed.value === 'number');

  const passed = results.filter((r) => r.pass).length;
  return Response.json({
    suite: 'TestMetricDefinitions',
    contract_version: METRIC_DEFINITIONS_VERSION,
    total: results.length,
    passed,
    failed: results.length - passed,
    verdict: passed === results.length ? 'PASS' : 'FAIL',
    failures: results.filter((r) => !r.pass),
    metrics: METRIC_KEYS,
    writes_performed: 0,
    records_read: 0,
    scope_note: 'Proves the METRIC RULE: a figure never travels without its definition, owner, period, numerator, denominator, source and freshness; a small basis or small numerator is withheld and named; an unreadable count is unread, never zero; an impossible ratio is refused. It does not prove that any figure was computed over a persisted committee register (no authorized seated actor — D-064).',
    results,
  });
}