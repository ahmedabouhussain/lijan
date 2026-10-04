// LIJAN™ — governed committee registers.
//
// A register (documents, decisions, actions, products, audit events) is read here, on the
// server, for a principal the governed read policy has already authorized for the committee.
// The same decision answers "may this principal open this record" (GetCommitteeRecord) and
// "may this principal list these records" (ListCommitteeRegister), so a record that is listed
// can always be opened — and a register can never show a different total than the home that
// summarizes it, because both are assembled from the committee's own records, not from a
// client-side query evaluated against the visitor's personal row-level rules.

const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));

export const COMMITTEE_REGISTERS: Record<string, { entity: string; sort: string; minRank: number; limit: number }> = {
  documents: { entity: 'Document', sort: '-updated_date', minRank: 1, limit: 200 },
  decisions: { entity: 'Decision', sort: '-created_date', minRank: 1, limit: 200 },
  actions: { entity: 'Action', sort: 'deadline', minRank: 1, limit: 200 },
  products: { entity: 'ProductInstance', sort: '-created_date', minRank: 1, limit: 200 },
  // The event log names actors; it is a member-rank register.
  audit_events: { entity: 'AuditEvent', sort: '-created_date', minRank: 2, limit: 200 },
};

export const REGISTER_KEYS = Object.keys(COMMITTEE_REGISTERS);

export async function loadRegister(sr: any, key: string, committeeId: string) {
  const def = COMMITTEE_REGISTERS[key];
  if (!def || !committeeId) return { items: [] as any[], has_more: false };
  const page = await sr.entities[def.entity]
    .filter({ committee_id: committeeId }, { sort: def.sort, limit: def.limit })
    .catch(() => null);
  const items = arr(page);
  return { items, has_more: !!(page && !Array.isArray(page) && page.has_more) };
}