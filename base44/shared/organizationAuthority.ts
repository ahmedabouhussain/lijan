// organizationAuthority.ts — organization-authority-1.0.0
//
// The authority layer for INSTITUTIONAL acts that are not committee acts: administering an
// organization's own membership register and the institution's own status.
//
// Why this is a separate contract from commandGuard: commandGuard derives a committee scope from the
// target record (`SCOPE_CHAIN`), and an Organization is not inside a committee — an institution is the
// record that committees sit under, not a record inside one. So an organization act cannot borrow the
// committee guard's scope, and inventing a scope for it would be exactly the "administration confers
// operational power" failure the brief forbids.
//
// What it therefore guarantees instead, in the same discipline as the committee guard:
//   • the target is a RECORD the server loads (never a scope taken from the request body);
//   • the actor's authority is derived from ACTIVE MEMBERSHIP ROWS OF THAT TARGET INSTITUTION —
//     never from `user.data.active_org_id`, never from which portal tab is open, never from a title;
//   • a platform administrator (app role `admin`) holds OVERSIGHT of the register and no operational
//     power in an institution: their administration is not converted into institutional authority;
//   • a person may not administer their own membership, and an owner's membership is protected from
//     every non-owner;
//   • every refusal carries a code, a sentence in both languages, and what may not be assumed from it.

export const ORGANIZATION_AUTHORITY_VERSION = 'organization-authority-1.0.0';

/** Member-administration actions and the membership state each one writes. */
export const ORG_MEMBER_ACTIONS = {
  suspend: 'suspended',
  unsuspend: 'active',
  revoke: 'revoked',
};

/** Institution-status actions and the organization state each one writes. */
export const ORG_STATUS_ACTIONS = {
  suspend: 'suspended',
  unsuspend: 'official_active',
};

/**
 * Every stop this contract can raise. Each row states its own class, both sentences, and the ONE thing
 * that may not be assumed from it — so a refusal is never read as more than it is.
 */
export const ORG_AUTHORITY_REFUSALS = {
  unauthenticated: {
    code: 'unauthenticated',
    class: 'refusal',
    ar: 'يلزم تسجيل الدخول: لا يُنسب فعل مؤسسي إلى جلسة غير معروفة.',
    en: 'Sign-in is required: an institutional act is never attributed to an unknown session.',
    never_assume: {
      ar: 'الجلسة المجهولة لا تحمل صفة، ولا تُنشئ إنكارًا بحق أحد.',
      en: 'An unknown session holds no capacity, and its absence proves nothing against anyone.',
    },
  },
  no_scope: {
    code: 'no_scope',
    class: 'boundary',
    ar: 'لم يُسمَّ سجل مؤسسي مستهدف: تُشتق الجهة من السجل نفسه لا من الطلب.',
    en: 'No institutional target record was named: the institution is derived from the record itself, not from the request.',
    never_assume: {
      ar: 'غياب الهدف ليس غياب سلطة.',
      en: 'A missing target is not a missing authority.',
    },
  },
  target_not_found: {
    code: 'target_not_found',
    class: 'boundary',
    ar: 'السجل المستهدف غير موجود: لا يقع الفعل على سجل متوقّع.',
    en: 'The target record does not exist: no act is performed against an expected record.',
    never_assume: {
      ar: 'الفعل لم يقع، ولم يُنشأ سجل بديل.',
      en: 'The act did not happen, and no substitute record was created.',
    },
  },
  not_a_member_of_target: {
    code: 'not_a_member_of_target',
    class: 'refusal',
    ar: 'صلاحيتك تُحسب بالعضوية الفعلية في الجهة المستهدفة نفسها، لا بالبوابة المعروضة ولا بالمسماك.',
    en: 'Your authority is computed from active membership of the target institution itself, not from the portal you are viewing or from your title.',
    never_assume: {
      ar: 'البوابة المفتوحة ليست عضوية، والعنوان ليس صفة.',
      en: 'An open portal is not a membership, and a URL is not a capacity.',
    },
  },
  insufficient_org_role: {
    code: 'insufficient_org_role',
    class: 'refusal',
    ar: 'دورك في هذه الجهة لا يحمل هذا الفعل: إدارة الأعضاء لمالك أو مدير الجهة، وحالة الجهة لمالكها.',
    en: 'Your role in this institution does not carry this act: membership administration belongs to the institution owner or administrator, and institution status to its owner.',
    never_assume: {
      ar: 'الدور الأدنى ليس دورًا مؤقتًا، وليس إذنًا ضمنيًّا.',
      en: 'A lesser role is not a temporary one, and it is never an implied permission.',
    },
  },
  admin_not_operational: {
    code: 'admin_not_operational',
    class: 'boundary',
    ar: 'إدارة المنصة تحمل رقابة على السجل ولا تحمل سلطة تشغيلية في الجهة: لا يُحوَّل دور المنصة إلى سلطة مؤسسية.',
    en: 'Platform administration holds oversight of the register and no operational power in an institution: a platform role is never converted into institutional authority.',
    never_assume: {
      ar: 'الرقابة قراءة، والقراءة ليست فعلًا.',
      en: 'Oversight is a read, and a read is not an act.',
    },
  },
  self_action_refused: {
    code: 'self_action_refused',
    class: 'integrity',
    ar: 'لا يُدير الشخص عضويته بنفسه: تعليق العضوية أو إلغاؤها فعل على الغير.',
    en: 'A person does not administer their own membership: suspending or revoking it is an act on another.',
    never_assume: {
      ar: 'الرفض لا يمنع الاستقالة، وهي مسار آخر غير هذا.',
      en: 'The refusal does not bar resignation, which is a different route, not this one.',
    },
  },
  owner_protected: {
    code: 'owner_protected',
    class: 'integrity',
    ar: 'عضوية المالك محمية من غير المالك: لا تُعلَّق ولا تُلغى إلا بمالك آخر.',
    en: "An owner's membership is protected from every non-owner: it is neither suspended nor revoked except by another owner.",
    never_assume: {
      ar: 'الحماية ليست مناعة أبدية، وهي مسار نقل الملكية لا هذا الفعل.',
      en: 'Protection is not immunity in perpetuity; ownership transfer is its own route, not this act.',
    },
  },
  invalid_action: {
    code: 'invalid_action',
    class: 'boundary',
    ar: 'الفعل المطلوب غير معرَّف في هذا العقد.',
    en: 'The requested act is not defined by this contract.',
    never_assume: {
      ar: 'الفعل غير المعروف لا يُفسَّر إلى أقرب فعل معروف.',
      en: 'An unknown act is never interpreted as the nearest known one.',
    },
  },
  target_already_in_state: {
    code: 'target_already_in_state',
    class: 'boundary',
    ar: 'السجل في هذه الحالة أصلًا: الفعل لا يُعاد ولا يُنتج أثرًا ثانيًا.',
    en: 'The record is already in that state: the act is not repeated and produces no second effect.',
    never_assume: {
      ar: 'الإعادة ليست تأكيدًا، ولا تُنشئ أثرًا جديدًا.',
      en: 'A repeat is not a confirmation, and it creates no new effect.',
    },
  },
  org_suspended: {
    code: 'org_suspended',
    class: 'refusal',
    ar: 'الجهة معلّقة: لا يُدار سجلها إلا بعد رفع التعليق.',
    en: 'The institution is suspended: its register is not administered until the suspension is lifted.',
    never_assume: {
      ar: 'التعليق لا يمحو السجل ولا يُلغي العضويات.',
      en: 'A suspension neither erases the register nor cancels memberships.',
    },
  },
  authority_unavailable: {
    code: 'authority_unavailable',
    class: 'unresolved',
    ar: 'تعذّر إثبات الصلاحية: لم يُنفَّذ الفعل.',
    en: 'Authority could not be established: the act was not performed.',
    never_assume: {
      ar: 'تعذّر الإثبات ليس إذنًا، ولا يُقرأ فشلًا في السجل.',
      en: 'A failed proof is not a permission, and it is not a record failure.',
    },
  },
};

const asArray = (x) => (Array.isArray(x) ? x : (x && x.items) || []);

/** The one refusal shape every organization command returns. */
export function orgRefusal(code, extra: Record<string, any> = {}) {
  const text = (ORG_AUTHORITY_REFUSALS as any)[code] || ORG_AUTHORITY_REFUSALS.authority_unavailable;
  return {
    allowed: false,
    code,
    status: extra.status || 403,
    reason: text.en,
    reason_ar: text.ar,
    never_assume: text.never_assume,
    class: text.class,
    contract_version: ORGANIZATION_AUTHORITY_VERSION,
    ...extra,
  };
}

export function orgAuthorityResponse(refusal: any) {
  return Response.json({
    error: refusal.reason,
    error_ar: refusal.reason_ar,
    code: refusal.code,
    class: refusal.class || null,
    never_assume: refusal.never_assume || null,
    role: refusal.role || null,
    required: refusal.required || null,
    oversight: refusal.oversight === true,
    contract_version: refusal.contract_version || ORGANIZATION_AUTHORITY_VERSION,
    correlation_id: refusal.correlation_id || null,
  }, { status: refusal.status || 403 });
}

export function orgCorrelation() {
  return 'corr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * Resolve the actor's authority over ONE institution, from that institution's own membership rows.
 * `required` is the least role the act carries: 'admin' (owner or admin) or 'owner'.
 */
export async function resolveOrganizationAuthority({ sr, callerUser, organization_id, required = 'admin', correlation_id = null }) {
  if (!callerUser) return orgRefusal('unauthenticated', { status: 401, correlation_id });
  if (!organization_id || typeof organization_id !== 'string') return orgRefusal('no_scope', { status: 400, correlation_id });

  let rows;
  try {
    rows = await sr.entities.OrganizationMembership.filter({ organization_id, user_id: callerUser.id, status: 'active' });
  } catch (_e) {
    return orgRefusal('authority_unavailable', { status: 503, correlation_id });
  }
  const mine = asArray(rows)[0] || null;

  if (!mine) {
    if (callerUser.role === 'admin') return orgRefusal('admin_not_operational', { status: 403, oversight: true, correlation_id });
    return orgRefusal('not_a_member_of_target', { status: 403, correlation_id });
  }
  const carries = required === 'owner' ? mine.role === 'owner' : ['owner', 'admin'].includes(mine.role);
  if (!carries) return orgRefusal('insufficient_org_role', { status: 403, role: mine.role, required, correlation_id });

  return {
    allowed: true,
    code: null,
    membership: mine,
    role: mine.role,
    required,
    contract_version: ORGANIZATION_AUTHORITY_VERSION,
    correlation_id,
    authority_context: `organization membership (${mine.role}) of ${organization_id}`,
  };
}