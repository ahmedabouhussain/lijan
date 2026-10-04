// LIJAN™ — execution action state, one classification.
//
// An action is exactly one of: completed, or open. An open action may additionally be overdue.
// Completed and overdue are mutually exclusive, so a register can never count the same action
// as completed and overdue, or as completed and open. The frontend mirror lives in
// src/lib/actionState.js and must stay identical in meaning.

export const DONE_STATUSES = ['closed', 'verified'];

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function classifyAction(a: any, today = todayIso()) {
  const done = DONE_STATUSES.includes(a?.status);
  const pastDue = !!a?.deadline && String(a.deadline).slice(0, 10) < today;
  return { done, open: !done, overdue: !done && (a?.status === 'overdue' || pastDue), pastDue };
}

/** Data contradictions that must never reach a register. */
export function actionViolations(a: any, today = todayIso()) {
  const v: string[] = [];
  const c = classifyAction(a, today);
  const progress = Number(a?.progress_percent || 0);
  if (c.done && progress < 100) v.push('completed_with_incomplete_progress');
  if (a?.status === 'overdue' && !c.pastDue) v.push('marked_overdue_before_deadline');
  if (progress < 0 || progress > 100) v.push('progress_out_of_range');
  return v;
}

export function summarizeActions(actions: any[], today = todayIso()) {
  let open = 0;
  let overdue = 0;
  let completed = 0;
  const violations: { id: string; violations: string[] }[] = [];
  for (const a of actions || []) {
    const c = classifyAction(a, today);
    if (c.done) completed += 1; else open += 1;
    if (c.overdue) overdue += 1;
    const v = actionViolations(a, today);
    if (v.length) violations.push({ id: a.id, violations: v });
  }
  const total = (actions || []).length;
  return {
    total,
    open,
    overdue,
    completed,
    consistent: total === open + completed && overdue <= open,
    violations,
  };
}