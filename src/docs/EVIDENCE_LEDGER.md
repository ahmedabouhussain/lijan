# سجل الأدلة | EVIDENCE LEDGER

**البناء المُختبَر**: معاينة الإنتاج `https://lijan.base44.app`، ملفات العمل بتاريخ **2026-10-05** · بصمة البناء الداخلي: `npx vite build` → `status=0` مع إخراج `dist/` (assets, fonts, index.html, lijan-sw.js).
**المنطقة الزمنية للاختبار**: UTC · **الشخصية**: مُشغِّل الاختبار الإداري (لا شخصية تركيبية).

## 1. اختبارات نُفِّذت (نتائج فعلية)

| معرّف الدليل | الحالة | ما نُفِّذ | النتيجة |
|---|---|---|---|
| **E-A07-DI-001…018** | **PASS** | `TestDecisionIntegrity` — 18 حالة على مُقيِّم الإصدار الواحد، **بلا أي كتابة** (`writes_performed: 0`) | 18/18 (بعد تصحيح حالة الدليل DI-012؛ التشغيل الأول كان 17/18) |
| E-A07-DI-001 | PASS | نموذج العيب المُبلَّغ عنه: هيئة ناخبة 0، 13 صوتًا، 5 من 6، بلا روابط، بلا تاريخ | `ready=false` والعوائق: `no_electorate · malformed_ballot · tally_mismatch · quorum_not_met · incomplete_proof_links · incomplete_signatures_per_policy`؛ المقبول=0 |
| E-A07-DI-002 | PASS | أصوات بلا مقعد وبلا شخص | 13 سجلًا مصنّفًا `malformed` · المقبول = **0** (لا تُحتسب أي أصوات مجهولة الهوية) |
| E-A07-DI-004 | PASS | عناصر إلزامية ناقصة | الاكتمال 2/6 والعناصر الناقصة معلنة صراحة |
| E-A07-DI-009 | PASS | مقعد يصوّت مرتين | `duplicate_seat_ballot` يرفض |
| E-A07-DI-011 | PASS | حضور دون النصاب | `quorum_not_met` |
| E-A07-DI-012 | PASS | قاعدة الثلثين حيث تنجح الأغلبية البسيطة وتُخفق الثلثان (3 من 5) | `threshold_not_met` · المطلوب=4 · الأساس «two-thirds of votes cast» |
| E-A07-DI-013 | PASS | حزمة متماسكة كاملة | `ready=true` (هيئة 5 · مقبول 5 · اكتمال 6/6) |
| E-A07-DI-014/015 | PASS | سياسة «غير مطلوبة» صريحة مقابل دليل مفقود | الصريح يُحتسب مستوفيًا (`declared:true`)؛ وبدونه تبقى التوقيعات **دليلًا ناقصًا** لا إذنًا |
| E-A07-DI-017/018 | PASS | ثبات البصمة وحساسيتها للمحتوى | نفس الحزمة ⇒ نفس البصمة (`sha256:` 71 حرفًا)؛ تغيير رقم القرار ⇒ بصمة مختلفة |
| **E-A02-GUARD-037** | **PASS** | `TestAuthorizationGuard` على نواة `authz-1.2.0-rc.1` (المُصلَّبة هذه الجلسة) | 30/30 أدوار · 12/12 إيجابي · 15/15 إغلاق-آمن |
| **E-A07-REFUSE-001** | **PASS** | `IssueDecision` بمعرّف غير موجود | `404 target_not_found` — رفض قبل أي كتابة، ومعه `policy_version` و`correlation_id` |
| **E-A11-REG-001** | **PASS** | `GenerateMeetingMinutes` بعد إضافة الحارس (انحدار) | `404 target_not_found` — الرفض يسبق كل العمل |
| **E-BUILD-001** | **PASS** | `npx vite build` بعد تغييرات الواجهة | `status=0` وإخراج `dist/` كامل |

**مستوى الضمان المُعلن**: بصمة SHA-256 لمحتوى الحزمة = بصمة محتوى فقط. **ليست** إثباتًا للصلاحية القانونية أو وقت موثوق أو مقاومة تعديل مستقلة، وتُعرض بهذا الوصف في الواجهة (E-A07-DI-017).

## 2. غير مُختبر / محجوب (معلن صراحة، لا يُحسب ناجحًا)

| معرّف | الحالة | السبب |
|---|---|---|
| A01 — اختبار المتصفح للمسارات القديمة | **NOT TESTED** | يلزم فتح جلسة معاينة؛ الإصلاح مُبرمَج ويمرّ البناء |
| A02–A06, A08–A24 | **NOT TESTED** | خارج نطاق هذه الدفعة |
| A07 — التنفيذ الكامل لإصدار قرار جديد في المعاينة | **BLOCKED** | يلزم فاعل مُقعد مخوّل ودورة حقيقية؛ اختُبر المنطق لا الدورة الحيّة |
| اختبار التزامن | **NOT ESTABLISHED** | قيد منصة (D-009) |
| A23–A24 (اختراق مستقل، استعادة نسخ، حمل، مقبولية) | **BLOCKED** | تتطلب موارد ومالكين خارجيين |
| نشر عام / بيانات حقيقية / الاتصال بمستلمين حقيقيين | **NOT AUTHORIZED** | قرار مالك منفصل |

## 3. قائمة التغييرات (للتراجع)

**أُضيف**: `base44/shared/decisionIntegrity.ts` · `base44/entities/IssueSnapshot.jsonc` · `base44/functions/TestDecisionIntegrity/entry.ts` · `src/components/raqeem/IssuanceIntegrityPanel.jsx` · `src/components/routing/LegacyRecordRedirect.jsx`
**عُدِّل**: `base44/entities/Decision.jsonc` (حقول إضافية فقط: `issued_at`, `issued_by_user_id`, `issued_by_name`, `issue_snapshot_id`, `issue_manifest_sha256`, `issuance_state`) · `base44/functions/IssueDecision/entry.ts` · `base44/functions/GetCommitteeRecord/entry.ts` · `src/components/raqeem/ProofChainSnapshot.jsx` · `src/pages/DecisionDetail.jsx` · `src/App.jsx` (مساران)
**أثر البيانات**: لا كتابة على أي سجل قائم · لا إعادة بذر · لا حذف · الكيان الجديد فارغ.
**التراجع**: إعادة الملفات أعلاه إلى نسختها السابقة؛ لا حاجة لتراجع بيانات.