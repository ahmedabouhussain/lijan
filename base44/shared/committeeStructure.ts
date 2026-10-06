// committeeStructure.ts — THE one declaration of what a committee relationship MEANS.
//
// A committee is not only a node in one organization tree. The platform must express, as typed and
// time-bound relationships: a parent and its subcommittees, an advisory group that produces
// recommendations, a joint committee serving several bodies, and — kept strictly apart — the body
// that appoints, the body that ratifies, the body that merely RECEIVES reports, and the body that
// oversees. Conflating those is how "reported to" quietly becomes "approved by".
//
// Contract committee-structure-1.0.0:
//   • Every relationship names its legal/mandate basis, scope, owner and dates.
//   • AUTHORITY FLOW IS EXPLICIT. A reporting recipient receives reports — it does NOT approve.
//   • Hierarchical and appointing/ratifying edges may not form a cycle: no body may, directly or
//     through a chain, be its own parent, appointer or ratifier.
//   • A delegation from a parent to a child is bounded: a named capability list, an explicit
//     reservation statement, a lawful expiry, never a capability the delegator does not itself hold,
//     and never a power the constitution keeps out of inter-committee delegation.
//   • A recommendation is not a decision. Only a parent's own decision-making act produces the
//     parent's decision.

export const STRUCTURE_VERSION = "committee-structure-1.0.0";

const t = (en: string, ar: string) => ({ en, ar });

/**
 * What each typed relationship conveys. `conveys_approval` is the field that keeps reporting and
 * oversight from becoming authority by accident, and it is asserted in the test suite.
 */
export const RELATIONSHIP_TYPES: Record<string, any> = {
  parent_committee: {
    ar: "اللجنة الأم", en: "Parent committee",
    hierarchical: true, authority_flow: "delegated_from_parent", conveys_approval: true,
    produces: "decision", requires_basis: true,
  },
  subcommittee: {
    ar: "لجنة فرعية", en: "Subcommittee",
    hierarchical: true, authority_flow: "delegated_to_child", conveys_approval: false,
    produces: "decision_within_grant", requires_basis: true,
  },
  advisory_group: {
    ar: "مجموعة عمل استشارية", en: "Advisory working group",
    hierarchical: false, authority_flow: "none", conveys_approval: false,
    produces: "recommendation", requires_basis: true,
  },
  joint_committee: {
    ar: "لجنة مشتركة", en: "Joint committee",
    hierarchical: false, authority_flow: "none", conveys_approval: false,
    produces: "shared_source_record", requires_basis: true,
  },
  appointing_body: {
    ar: "جهة التعيين", en: "Appointing body",
    hierarchical: false, authority_flow: "appoints", conveys_approval: false,
    conveys_appointment: true, produces: "appointment", requires_basis: true,
  },
  ratifying_body: {
    ar: "جهة المصادقة", en: "Ratifying body",
    hierarchical: false, authority_flow: "ratifies", conveys_approval: true,
    produces: "ratification", requires_basis: true,
  },
  reporting_recipient: {
    ar: "متلقّي التقارير", en: "Reporting recipient",
    hierarchical: false, authority_flow: "none", conveys_approval: false,
    receives_reports: true, produces: "received_report", requires_basis: true,
  },
  oversight_body: {
    ar: "جهة الرقابة", en: "Oversight body",
    hierarchical: false, authority_flow: "oversight_only", conveys_approval: false,
    drill_through_scoped: true, produces: "scoped_indicator", requires_basis: true,
  },
  execution_dependency: {
    ar: "تبعية تنفيذية", en: "Execution dependency",
    hierarchical: false, authority_flow: "none", conveys_approval: false,
    produces: "dependency", requires_basis: true,
  },
  secretariat_custodian: {
    ar: "أمانة الحفظ", en: "Secretariat custodian",
    hierarchical: false, authority_flow: "custody", conveys_approval: false,
    produces: "custody", requires_basis: true,
  },
};

export const RELATIONSHIP_TYPE_KEYS = Object.keys(RELATIONSHIP_TYPES);

/** Edges that carry authority and therefore may never form a cycle. */
export const AUTHORITY_EDGE_TYPES = RELATIONSHIP_TYPE_KEYS.filter(
  (k) => RELATIONSHIP_TYPES[k].hierarchical || RELATIONSHIP_TYPES[k].conveys_approval
    || RELATIONSHIP_TYPES[k].conveys_appointment === true,
);

/** Reporting and oversight are networks, not hierarchies: they may loop freely. */
export const NON_AUTHORITY_EDGE_TYPES = RELATIONSHIP_TYPE_KEYS.filter(
  (k) => !AUTHORITY_EDGE_TYPES.includes(k),
);

export const REVIEW_OR_OVERTURN = ["none", "review", "ratify", "overturn"];

/**
 * Powers the constitution keeps OUT of inter-committee delegation. A parent may not hand a child
 * the right to reconstitute committees, close them, or produce a digital signature — those follow
 * the instrument and an approved trust service, not a management decision.
 */
export const INTER_COMMITTEE_NON_DELEGABLE = [
  "committee.manage", "committee.close", "decision.digital_sign",
];

export const STRUCTURE_REFUSALS: Record<string, any> = {
  unknown_relationship_type: t("The relationship type is not in the structure contract", "نوع العلاقة غير معرّف في عقد البنية"),
  self_relationship: t("A committee cannot hold a relationship with itself", "لا يمكن أن تربط اللجنة علاقة بنفسها"),
  missing_basis: t("Every relationship states its legal or mandate basis", "كل علاقة تسمّي سندها النظامي أو التكليفي"),
  missing_counterparty: t("A counterparty committee must exist", "يجب أن تكون اللجنة المقابلة موجودة"),
  authority_cycle: t("This relationship would make a body its own parent, appointer or ratifier", "هذه العلاقة تجعل جهةً أماً لنفسها أو معيّنةً لنفسها أو مصادقةً لنفسها"),
  delegation_not_lawful: t("The delegated capabilities are not lawful for this relationship", "القدرات المفوَّضة غير جائزة في هذه العلاقة"),
  delegation_beyond_delegator: t("The delegator cannot delegate a power it does not itself hold", "لا يجوز تفويض قدرة لا يملكها المُفوِّض"),
  delegation_needs_expiry: t("An inter-committee delegation states a lawful expiry", "التفويض بين اللجان يحدّد انتهاءً نظاميًّا"),
  delegation_needs_reservation: t("The parent must state what it reserves, even as 'none'", "على اللجنة الأم أن تصرّح بما تحتفظ به ولو بـ«لا شيء»"),
  recommendation_is_not_decision: t("A recommendation is not the parent's decision", "التوصية ليست قرار اللجنة الأم"),
  out_of_scope_approval: t("This body holds no approval power over the parent's decision", "هذه الجهة لا تملك صلاحية اعتماد قرار اللجنة الأم"),
  re_delegation_refused: t("A delegated power may not be re-delegated to a further body", "لا يجوز إعادة تفويض قدرة مُفوَّضة إلى جهة أخرى"),
};

function refuse(code: string, extra: Record<string, any> = {}, status = 409) {
  const text = STRUCTURE_REFUSALS[code] || { en: code, ar: null };
  return { ok: false, code, status, reason: text.en, reason_ar: text.ar, ...extra };
}

export function relationshipContract(type: string) {
  return RELATIONSHIP_TYPES[type] || null;
}

/** Whether one type conveys approval — the single question a surface must never guess. */
export function conveysApproval(type: string) {
  return RELATIONSHIP_TYPES[type] ? RELATIONSHIP_TYPES[type].conveys_approval === true : false;
}

export function assertRelationshipShape({ subject_committee_id, counterparty_committee_id, relationship_type, legal_basis, counterparty_exists = true }: Record<string, any>) {
  if (!RELATIONSHIP_TYPES[relationship_type]) return refuse("unknown_relationship_type", { status: 400 });
  if (!counterparty_committee_id || !counterparty_exists) return refuse("missing_counterparty", { status: 404 });
  if (subject_committee_id === counterparty_committee_id) return refuse("self_relationship", { status: 409 });
  if (RELATIONSHIP_TYPES[relationship_type].requires_basis && !String(legal_basis || "").trim()) {
    return refuse("missing_basis", { status: 400 });
  }
  return null;
}

/**
 * Normalise a relationship into a directed authority edge (from the body that holds the power to the
 * body it binds), or null when the type carries no authority. Used for cycle detection.
 */
export function authorityEdge(relation: any) {
  const type = relation.relationship_type;
  const contract = RELATIONSHIP_TYPES[type];
  if (!contract || !AUTHORITY_EDGE_TYPES.includes(type)) return null;
  const outbound = relation.direction !== "inbound";
  if (type === "parent_committee") return outbound
    ? { from: relation.counterparty_committee_id, to: relation.committee_id, type }
    : { from: relation.committee_id, to: relation.counterparty_committee_id, type };
  if (type === "subcommittee") return outbound
    ? { from: relation.committee_id, to: relation.counterparty_committee_id, type }
    : { from: relation.counterparty_committee_id, to: relation.committee_id, type };
  // appointing_body / ratifying_body: outbound means "this committee performs the act over the other".
  return outbound
    ? { from: relation.committee_id, to: relation.counterparty_committee_id, type }
    : { from: relation.counterparty_committee_id, to: relation.committee_id, type };
}

/**
 * Would adding `candidate` close an authority cycle? Fail-closed: the answer is computed from the
 * edges the server read, never from a client claim about the graph.
 */
export function detectAuthorityCycle(edges: any[], candidate: any) {
  const edge = authorityEdge(candidate);
  if (!edge) return null; // reporting / oversight networks may loop
  const adjacency: Record<string, string[]> = {};
  for (const e of edges || []) {
    const row = authorityEdge(e);
    if (!row) continue;
    (adjacency[row.from] = adjacency[row.from] || []).push(row.to);
  }
  const stack = [edge.to];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const node = stack.pop() as string;
    if (node === edge.from) return refuse("authority_cycle", { cycle_node: node, status: 409 });
    if (seen.has(node)) continue;
    seen.add(node);
    for (const next of adjacency[node] || []) stack.push(next);
  }
  return null;
}

/**
 * A parent → child delegation. Bounded on four sides so a subcommittee can never end up with more
 * power than the parent holds, for longer than the parent stated, over matters the constitution
 * keeps out of such delegation.
 */
export function validateInterCommitteeDelegation({
  delegated_capabilities = [], reserved_matters = null, expires_at = null,
  delegatorCapabilities = [], relation_type = null, contract_version = STRUCTURE_VERSION,
}: Record<string, any>) {
  const list = Array.isArray(delegated_capabilities)
    ? [...new Set(delegated_capabilities.filter((c) => typeof c === "string" && c))]
    : [];
  if (!["subcommittee", "advisory_group"].includes(relation_type)) return null; // no delegation in this type
  if (list.length > 0 && reserved_matters === null) return refuse("delegation_needs_reservation", { contract_version });
  for (const cap of list) {
    if (INTER_COMMITTEE_NON_DELEGABLE.includes(cap)) return refuse("delegation_not_lawful", { capability: cap, contract_version });
    if (!delegatorCapabilities.includes(cap)) return refuse("delegation_beyond_delegator", { capability: cap, contract_version });
  }
  if (list.length > 0 && !expires_at) return refuse("delegation_needs_expiry", { contract_version });
  return null;
}

/** A child may not pass on what it holds only by delegation. */
export function assertNoReDelegation({ source_relationship, delegated_capabilities = [], contract_version = STRUCTURE_VERSION }: Record<string, any>) {
  const inbound = Array.isArray(source_relationship?.delegated_capabilities)
    ? source_relationship.delegated_capabilities
    : [];
  const held = new Set(inbound);
  const reuse = (delegated_capabilities || []).filter((c) => held.has(c));
  if (inbound.length > 0 && reuse.length > 0) {
    return refuse("re_delegation_refused", { capabilities: reuse, contract_version });
  }
  return null;
}