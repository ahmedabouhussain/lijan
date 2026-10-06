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

// ── Evidence verification (contract: base44/shared/evidenceAcceptance.ts) ──
// Submitting is not verifying, and closure is not an assertion: an action closes only on a verdict
// ACCEPTED by an independent verifier, and the verdict is bound to the revision it judged.
export const VERIFICATION_STATES = ["not_submitted", "submitted", "returned", "accepted"];

export const VERIFICATION_LABELS = {
  not_submitted: { ar: "لم يُقدَّم دليل", en: "No evidence submitted", color: "bg-secondary text-muted-foreground" },
  submitted: { ar: "بانتظار تحقق مستقل", en: "Awaiting independent verification", color: "bg-state-ceremonial-surface text-state-ceremonial-ink" },
  returned: { ar: "أُعيد للتعديل", en: "Returned for correction", color: "bg-state-warning-surface text-state-warning-ink" },
  accepted: { ar: "دليل مقبول", en: "Evidence accepted", color: "bg-state-success-surface text-state-success-ink" },
};

export function verificationStateOf(action) {
  const state = action?.verification_state;
  return VERIFICATION_STATES.includes(state) ? state : "not_submitted";
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