// LIJAN™ — execution action state (interface mirror).
//
// The server owns the authoritative counts (base44/shared/actionState.ts). This mirror exists so a
// single row and a single card read the same rule as the register: an action is completed, or open
// — and an open action may additionally be overdue. Completed and overdue are never both true.
export const DONE_STATUSES = ["closed", "verified"];

export function classifyAction(action) {
  const done = DONE_STATUSES.includes(action?.status);
  const pastDue = !!action?.deadline && String(action.deadline).slice(0, 10) < todayIso();
  return {
    done,
    open: !done,
    overdue: !done && (action?.status === "overdue" || pastDue),
  };
}

export function isDone(action) {
  return DONE_STATUSES.includes(action?.status);
}

export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** One set of totals, so a card and the register it opens can never disagree. */
export function summarizeActions(actions = []) {
  let open = 0;
  let overdue = 0;
  let completed = 0;
  for (const action of actions) {
    const state = classifyAction(action);
    if (state.done) completed += 1;
    else open += 1;
    if (state.overdue) overdue += 1;
  }
  return { total: actions.length, open, overdue, completed };
}