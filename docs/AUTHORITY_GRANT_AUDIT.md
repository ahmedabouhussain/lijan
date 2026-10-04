# تدقيق منح الصلاحيات الفعلية (AuthorityGrant) — LIJAN™

**حالة التنفيذ: `AUDITED FROM SOURCE — NOT BROWSER TESTED`**
المصدر: 7 سجلات `AuthorityGrant` مقروءة فعليًا + كود سياسة الصلاحيات. لا يوجد في هذا المستند أي استنتاج من تطابق الأسماء.

---

## 1. الواقع المقروء من السجلات السبعة

جميعها للشخصية `DEMO-USER-DR-HAMAD-MAJEEGHEER`، بمجموعة العرض `DR_HAMAD_GOVERNED_DEMO_V1`.

**حقيقة حاسمة: `permitted_actions` فارغة (`[]`) في السجلات السبعة كلها.** أي أن «الأفعال المسموحة» لا تُقرأ من السجل، بل تُشتق من جدول الدور في الكود.

| اللجنة | الدور | Grant ID | الأفعال المسموحة (مصدر السياسة) | الأفعال الممنوعة | النطاق | البداية/الانتهاء | مصدر السياسة | النتيجة |
|---|---|---|---|---|---|---|---|---|
| الابتكار وتطوير الخدمات | secretary | `6ac13917981a4c31b662177d` | meeting.schedule · agenda.edit · minutes.draft · minutes.review · attendance.certify · action.admin · read · audit.read | vote.cast/call/certify · decision.issue · minutes.approve · committee.act | هذه اللجنة فقط | 2026-01-01 → 2027-12-31 | `ROLE_CAPABILITIES.secretary` | **PASS (منطقيًا)** |
| المخاطر واستمرارية الأعمال | member | `6ac13916bb39167508cc4069` | agenda.propose · vote.cast · decision.sign · comment.shared · read | meeting.start · decision.issue · minutes.approve · vote.call/certify · action.admin | هذه اللجنة فقط | 2026-01-01 → 2027-12-31 | `ROLE_CAPABILITIES.member` | **PASS مع ملاحظة (decision.sign)** |
| الاستثمار والشراكات الاستراتيجية | member | `6ac13915d5caa535e160e2b6` | كما أعلاه | كما أعلاه | هذه اللجنة فقط | 2026-01-01 → 2027-12-31 | `ROLE_CAPABILITIES.member` | **PASS** |
| اللجنة التوجيهية لتمويل الشركات الصغيرة والمتوسطة | vice_chair | `6ac13914d24b4b8b617ede0d` | **`requires_delegation: true` و`delegation_status: none`** + أفعال نائب الرئيس | — | هذه اللجنة فقط | 2026-01-01 → 2027-12-31 | مساران متعارضان (أدناه) | **FAIL (مسار الأوامر)** |
| التحول الرقمي والذكاء المؤسسي | chair | `6ac13913bb73c50f8aa78bdd` | جميع صلاحيات الرئيس | — | هذه اللجنة فقط | 2026-01-01 → 2027-12-31 | `ROLE_CAPABILITIES.chair` | **PASS** |
| اللجنة التنفيذية لمجموعة إعلان | chair | `6ac139124e9fb801d0d3e66f` | جميع صلاحيات الرئيس | — | هذه اللجنة فقط | 2026-01-01 → 2027-12-31 | `ROLE_CAPABILITIES.chair` | **PASS** |
| اللجنة الوطنية لتنمية الشركات الصغيرة والمتوسطة | member | `6ac1391109946a0520089d26` | agenda.propose · vote.cast · decision.sign · comment.shared · read | meeting.start · decision.issue · minutes.approve | هذه اللجنة فقط | 2026-01-01 → 2027-12-31 | `ROLE_CAPABILITIES.member` | **PASS مع ملاحظة (decision.sign)** |

**النطاق:** كل منحة مقيّدة بـ `committee_id` واحد؛ لا يوجد أي تسرّب لصلاحية الرئيس إلى لجنة أخرى (الفلترة بـ `committee_id` في `authorityKernel.ts` و`committeeAuth.ts`).

---

## 2. نتيجة سيناريوهات الاختبار المطلوبة

| السيناريو | النتيجة | الدليل |
|---|---|---|
| العضو في اللجنة الوطنية لا يبدأ اجتماعًا ولا يصدر قرارًا ولا يعتمد محضرًا | **PASS** | `member` لا يحمل `meeting.start` ولا `decision.issue` ولا `minutes.approve` |
| رئيس إعلان والتحول الرقمي يرى وظائف الرئيس في هاتين اللجنتين فقط | **PASS** | منحتان بدور `chair`، كل واحدة بـ `committee_id` مستقل |
| نائب الرئيس لا يرث كل صلاحيات الرئيس تلقائيًا | **FAIL في مسار الأوامر / PASS في مسار العرض** | `ROLE_CAPABILITIES.vice_chair` يمنح `meeting.start, decision.issue, minutes.approve, vote.call, vote.certify` بلا شرط تفويض — بينما `evaluateCommitteeAuthority` تجعل `actingChair = isChair \|\| (isViceChair && delegationActive)` ولا تمنح `can_approve_minutes/can_decide/can_approve_decisions` إلا للرئيس |
| العضو في الاستثمار والمخاطر لا يرى وظائف الرئيس أو أمين السر | **PASS** | لا مقعد آخر له في هاتين اللجنتين؛ والدور الأعلى يحكم داخل اللجنة نفسها فقط |
| أمين سر الابتكار يدير المسودة والتداول ولا يعتمد أو يصوّت أو يصدر قرارًا | **PASS** | `secretary` بلا `minutes.approve` / `vote.*` / `decision.issue` |
| انتهاء العضوية أو إلغاؤها أو تغيير المقعد يبطل المنحة المشتقة | **PASS جزئيًا** | `committeeAuth.ts` يُبطل الدور إذا خرجت المنحة عن `validity_start/end` أو كان `conflict_status: declared`؛ لكن لا فحص لـ `status` العضوية مقابل المنحة (OPEN) |
| تمرير `role` أو `organization_id` أو `committee_id` من العميل لا يوسّع الصلاحية | **PASS مُتحقَّق جزئيًا / OPEN** | `GetCommitteeRecord` يتجاهل كل قيم العميل. أما `resolveAuthority` فيقرأ `organization_id` من معاملاته (`opts.organization_id \|\| user.active_org_id`) — المواضع المُعايَنة تمرّر قيمة مشتقة من الخادم، ولم يُمسح كل المواضع الخمسين واحدًا واحدًا |

---

## 3. الفجوات (FINDINGS)

- **F-1 — المنح لا تحكم مسار الأوامر.** `resolveAuthority` (50 موضع استدعاء) لا يقرأ `AuthorityGrant` إطلاقًا؛ الإنفاذ من جدول الدور وحده. المنح تُقرأ في مسار العرض فقط (`committeeAuth.ts`) وفي التهيئة/العرض (`provisioning`, `demoPersonas`). ⇒ **المنحة وثيقة، لا قرار.**
- **F-2 — تعارض مصدرين للسياسة.** دالتان تجيبان «ما صلاحية هذا المقعد»: `authorityKernel.ts` و`committeeAuth.ts`، وبينهما فرق فعلي في نائب الرئيس. ⇒ يجب أن يبقى واحد ويستشير الآخر.
- **F-3 — لا بوّابة تفويض في مسار الأوامر.** المنحة تحمل `requires_delegation: true` و`delegation_status: none`، وهذا لا يُقرأ.
- **F-4 — العضو يملك `decision.sign`.** توقيع قرار ليس «مساهمة»؛ يجب فصله إلى صلاحية اعتماد صريحة.
- **F-5 — `organization_id` مقبول من معاملات النواة.** يجب أن يُشتق من اللجنة أو من عضوية المؤسسة، لا من الطلب.
- **F-6 — كشف التنحّي بالاسم.** `Recusal` يُطابق بـ `member_name` النصّي لا بمعرّف العضوية.
- **F-7 — حقل «الأفعال المسموحة» معطّل.** فارغ في السجلات السبعة كلها؛ أي سطح يقرأه لا يقرأ شيئًا.

## 4. الإصلاح المقترح (لم يُنفّذ — ينتظر أمرًا صريحًا)

1. سلطة واحدة: `resolveAuthority` يستشير المنحة للمقعد، ويستخدم جدول الدور كسقف أعلى (`ceiling`) لا كمنحة.
2. `vice_chair` لا يتجاوز سقف النائب إلا بـ `delegation_active` (نفس قاعدة مسار العرض).
3. رفض أي معامل `organization_id` من العميل، واشتقاقه منسوبًا من اللجنة.
4. فصل `decision.sign` إلى `decision.attest` مقيّدة بمنحة اعتماد.
5. تعبئة `permitted_actions` فعليًا وقت الإسناد، وجعل القراءة منها.
6. تطبيع التنحّي على `membership_id`.