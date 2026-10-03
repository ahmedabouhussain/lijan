import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Isolated demo namespace for the "National Committee Adoption & Impact Showcase".
// Everything created here is tagged is_demo_data + demo_scenario_id so it can never
// be mistaken for a live operational record and never collides with real org data.
const SCENARIO_ID = 'DEMO-NSDC-2026';
const SOURCE_REF = 'NSDC Second Meeting pack, 8 Sep 2026';
const SOURCE_AS_OF = '2026-09-08';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — founder/admin only' }, { status: 403 });

    const sr = base44.asServiceRole;

    const existing = await sr.entities.Committee.filter({ is_demo_data: true, demo_dataset: SCENARIO_ID }).catch(() => []);
    if (existing && existing.length > 0) {
      return Response.json({ status: 'already_seeded', scenario_id: SCENARIO_ID, committees: existing.length });
    }

    // --- Organizations ---
    const moci = await sr.entities.Organization.create({
      name_ar: 'وزارة التجارة والصناعة', name_en: 'Ministry of Commerce and Industry',
      type: 'ministry', status: 'sandbox_active', is_demo_data: true, demo_dataset: SCENARIO_ID,
    });
    const elanOrg = await sr.entities.Organization.create({
      name_ar: 'مجموعة إعلان', name_en: 'ELAN Group',
      type: 'organization', status: 'sandbox_active', is_demo_data: true, demo_dataset: SCENARIO_ID,
    });

    // --- NSDC Committee ---
    const nsdc = await sr.entities.Committee.create({
      organization_id: moci.id,
      name_ar: 'اللجنة الوطنية لتنمية الشركات الصغيرة والمتوسطة',
      name_en: 'National Committee for Small and Medium Enterprise Development',
      slug: 'nsdc-sme-committee-demo', type: 'national_committee', status: 'active',
      classification: 'confidential', meeting_cadence: 'monthly',
      mandate: 'تنمية الشركات الصغيرة والمتوسطة عبر أربعة مسارات عمل: التمويل، المعرفة، الأسواق، ورأس المال.',
      is_demo_data: true, demo_dataset: SCENARIO_ID,
    });

    // Dr. Hamad persona membership in NSDC (Access to Markets workstream)
    await sr.entities.CommitteeMembership.create({
      organization_id: moci.id, committee_id: nsdc.id,
      full_name: 'Dr. Hamad Salem Al-Muhajeer', full_name_ar: 'الدكتور حمد سالم المهجير',
      role: 'member', authority_level: 'advisory', voting_right: false, status: 'active',
      institution_name: 'بنك قطر للتنمية | Qatar Development Bank',
      is_demo_data: true, demo_dataset: SCENARIO_ID,
    });

    // --- NSDC Meeting (الاجتماع الثاني) ---
    const nsdcMeeting = await sr.entities.Meeting.create({
      organization_id: moci.id, committee_id: nsdc.id,
      title: 'NSDC Second Meeting', title_ar: 'الاجتماع الثاني',
      date: '2026-09-08T10:00:00Z', duration_minutes: 75, mode: 'physical', status: 'completed',
      agenda_ready: true,
    });

    await sr.entities.AgendaItem.create({
      organization_id: moci.id, committee_id: nsdc.id, meeting_id: nsdcMeeting.id, sequence: 1,
      title: 'Access to Markets workstream update', title_ar: 'مستجدات مجموعة عمل الوصول إلى الأسواق',
      presenter: 'أمين السر', time_allocation_minutes: 10,
      required_decision: 'اعتماد أولويات مبادرات فريق النفاذ إلى الأسواق', classification: 'confidential',
      readiness: 'ready', status: 'decided',
    });

    // --- NSDC Decision ---
    const decision = await sr.entities.Decision.create({
      organization_id: moci.id, committee_id: nsdc.id, meeting_id: nsdcMeeting.id,
      title: 'Approve the priority initiatives of the Access to Markets workstream',
      title_ar: 'اعتماد أولويات مبادرات فريق النفاذ إلى الأسواق',
      proposal: 'اعتماد اللجنة لأربع مبادرات ذات أولوية ضمن مسار الوصول إلى الأسواق، بعد استعراضها في اجتماع مجموعة العمل بتاريخ 26 أغسطس 2026.',
      legal_basis: 'ميثاق اللجنة الوطنية المعتمد',
      dependencies: 'عرض وزارة المالية حول القائمة الإلزامية والقيمة المحلية — مستهدف خلال شهر أكتوبر 2026، دون تاريخ محدد في المصدر.',
      owner_name: 'فريق النفاذ إلى الأسواق', status: 'in_review',
    });

    const initiatives = [
      {
        title: 'Activate the "Tahfeez" program for SME public procurement',
        title_ar: 'تفعيل برنامج «تحفيز» للمشتريات العامة للشركات الصغيرة والمتوسطة',
        objective: 'Direct government purchasing demand toward qualified SMEs.',
        objective_ar: 'توجيه الطلب الحكومي نحو الشركات الصغيرة والمتوسطة المؤهلة.',
        proposed_owner: 'بنك قطر للتنمية | Qatar Development Bank', owner_verification_status: 'needs_confirmation',
      },
      {
        title: 'SME Golden Record as a unified central window',
        title_ar: 'السجل الذهبي للشركات الصغيرة والمتوسطة كنافذة مركزية موحدة',
        objective: 'Consolidate SME registration and benefits into one reference record.',
        objective_ar: 'توحيد تسجيل الشركات الصغيرة والمتوسطة واستحقاق المزايا في سجل مرجعي واحد.',
        proposed_owner: 'وزارة التجارة والصناعة | Ministry of Commerce and Industry', owner_verification_status: 'needs_confirmation',
      },
      {
        title: 'Ready-made factory model for projects and near-ready zones',
        title_ar: 'نموذج المصنع الجاهز للمشروعات والمناطق شبه الجاهزة',
        objective: 'Reduce setup time and cost for industrial SMEs.',
        objective_ar: 'تقليص زمن وتكلفة التأسيس للمنشآت الصناعية الصغيرة والمتوسطة.',
        proposed_owner: 'وزارة التجارة والصناعة | Ministry of Commerce and Industry', owner_verification_status: 'needs_confirmation',
      },
      {
        title: 'Dual-use, free-trade and investment-protection agreements with high-potential markets',
        title_ar: 'اتفاقيات الاستخدام المزدوج والتجارة الحرة وحماية الاستثمار مع الأسواق ذات الإمكانات المرتفعة',
        objective: 'Open high-potential export markets for Qatari SMEs.',
        objective_ar: 'فتح أسواق تصدير ذات إمكانات مرتفعة أمام الشركات الصغيرة والمتوسطة القطرية.',
        proposed_owner: 'وزارة التجارة والصناعة | Ministry of Commerce and Industry', owner_verification_status: 'needs_confirmation',
      },
    ];

    for (let i = 0; i < initiatives.length; i++) {
      const it = initiatives[i];
      await sr.entities.Initiative.create({
        organization_id: moci.id, committee_id: nsdc.id,
        workstream_en: 'Access to Markets', workstream_ar: 'الوصول إلى الأسواق',
        title: it.title, title_ar: it.title_ar, objective: it.objective, objective_ar: it.objective_ar,
        status: 'prioritized', proposed_owner: it.proposed_owner, owner_verification_status: it.owner_verification_status,
        supporting_entities: 'وزارة التجارة والصناعة، بنك قطر للتنمية، وزارة المالية',
        dependencies: 'عرض وزارة المالية حول القائمة الإلزامية والقيمة المحلية (مستهدف أكتوبر 2026، دون تاريخ محدد)',
        required_evidence: 'لم يحدد المصدر وثائق داعمة لهذه المبادرة — يتطلب استكمالاً',
        risks: 'لم يحدد المصدر مخاطر محددة لهذه المبادرة — يتطلب استكمالاً',
        requested_decision: 'اعتماد أولويات مبادرات فريق النفاذ إلى الأسواق',
        milestones: 'اجتماع مجموعة العمل 26 أغسطس 2026: استعراض المبادرات وتقييم التقدم المحرز',
        impact_indicators: 'قياس أثر الحوافز والمزايا المقدمة إلى القطاعات وتأثيرها على الوصول إلى الأسواق (قيد الإعداد)',
        source_reference: SOURCE_REF, source_as_of: SOURCE_AS_OF, freshness_status: 'fresh',
        next_permitted_action: 'مراجعة وتعليق وترشيح وإرفاق أدلة — دون اعتماد القرار',
        sequence: i + 1, is_demo_data: true, demo_scenario_id: SCENARIO_ID,
      });
    }

    // --- Evidence readiness register ---
    const knownMembers = [
      'مصرف قطر المركزي', 'بنك قطر للتنمية', 'وزارة التجارة والصناعة', 'مركز قطر للمعلومات الائتمانية',
      'المجلس الوطني للبحوث والتطوير والابتكار', 'المجلس الوطني للتخطيط', 'وزارة العمل',
      'وزارة الاتصالات وتكنولوجيا المعلومات', 'وزارة المالية', 'جهاز قطر للاستثمار', 'مركز قطر للمال',
      'واحة قطر للعلوم والتكنولوجيا',
    ];
    const knownNonMembers = ['استثمر قطر', 'جمعية كيو في سي إيه (QVCA)'];

    const evidenceRows = [];
    for (const name of knownMembers) {
      evidenceRows.push({ entity_name: name, entity_type: 'member', nomination_status: 'received', data_status: 'received', is_aggregate_placeholder: false });
    }
    for (const name of knownNonMembers) {
      evidenceRows.push({ entity_name: name, entity_type: 'non_member', nomination_status: 'received', data_status: 'received', is_aggregate_placeholder: false });
    }
    evidenceRows.push({
      entity_name: 'Qatar Development Bank | بنك قطر للتنمية', entity_type: 'member',
      nomination_status: 'received', data_status: 'received', is_aggregate_placeholder: false,
    });
    // Remaining member/non-member counts: the source gives totals (19 member / 11 non-member
    // nominated; 11 member / 4 non-member received) but not every entity's identity — modeled
    // as explicit aggregate placeholders rather than invented names.
    evidenceRows.push({
      entity_name: 'Additional nominated member entities (identities not itemized in source)', entity_type: 'member',
      nomination_status: 'received', data_status: 'awaiting_submission', is_aggregate_placeholder: true, aggregate_count: 19 - knownMembers.length - 1,
    });
    evidenceRows.push({
      entity_name: 'Additional nominated non-member entities (identities not itemized in source)', entity_type: 'non_member',
      nomination_status: 'received', data_status: 'awaiting_submission', is_aggregate_placeholder: true, aggregate_count: 11 - knownNonMembers.length,
    });

    for (const row of evidenceRows) {
      await sr.entities.EvidenceSubmissionEntry.create({
        organization_id: moci.id, committee_id: nsdc.id,
        workstream_en: 'Access to Markets', workstream_ar: 'الوصول إلى الأسواق',
        entity_name: row.entity_name, entity_type: row.entity_type,
        nomination_status: row.nomination_status, data_status: row.data_status,
        source_reference: SOURCE_REF, source_as_of: SOURCE_AS_OF,
        unresolved_questions: row.is_aggregate_placeholder
          ? 'الهوية الدقيقة لهذه الجهات غير محددة في مادة الاجتماع — يتطلب استكمالاً من أمانة السر'
          : '',
        is_aggregate_placeholder: !!row.is_aggregate_placeholder, aggregate_count: row.aggregate_count || 1,
        is_demo_data: true, demo_scenario_id: SCENARIO_ID,
      });
    }

    // --- ELAN reference meeting (historical reference, not a LIJAN-governed meeting) ---
    const elanCommittee = await sr.entities.Committee.create({
      organization_id: elanOrg.id,
      name_ar: 'اللجنة التنفيذية لمجموعة إعلان', name_en: 'ELAN Executive Committee',
      slug: 'elan-executive-committee-demo', type: 'special_committee', status: 'active',
      classification: 'confidential', mandate: 'إشراف تنفيذي على أداء مجموعة إعلان — سياق تجريبي اصطناعي فقط.',
      is_demo_data: true, demo_dataset: SCENARIO_ID,
    });

    await sr.entities.CommitteeMembership.create({
      organization_id: elanOrg.id, committee_id: elanCommittee.id,
      full_name: 'Dr. Hamad Salem Al-Muhajeer', full_name_ar: 'الدكتور حمد سالم المهجير',
      role: 'chair', authority_level: 'advisory', voting_right: false, status: 'active',
      institution_name: 'دور تجريبي افتراضي | Synthetic Demonstration Role',
      is_demo_data: true, demo_dataset: SCENARIO_ID,
    });

    const elanMeeting = await sr.entities.Meeting.create({
      organization_id: elanOrg.id, committee_id: elanCommittee.id,
      title: 'ELAN Executive Committee Meeting No. 01-26', title_ar: 'اجتماع اللجنة التنفيذية رقم 01-26',
      date: '2026-05-11T13:00:00Z', duration_minutes: 60, location: 'Al Rayyan Meeting Room',
      mode: 'physical', status: 'completed', agenda_ready: true,
    });

    const elanItems = [
      { title: 'ELAN Performance & Financial Forecast for 2026', title_ar: 'أداء مجموعة إعلان والتوقعات المالية لعام 2026', minutes: 50 },
      { title: 'Other matters', title_ar: 'موضوعات أخرى', minutes: 10 },
    ];
    for (let i = 0; i < elanItems.length; i++) {
      await sr.entities.AgendaItem.create({
        organization_id: elanOrg.id, committee_id: elanCommittee.id, meeting_id: elanMeeting.id, sequence: i + 1,
        title: elanItems[i].title, title_ar: elanItems[i].title_ar, presenter: 'ELAN',
        time_allocation_minutes: elanItems[i].minutes,
        required_decision: 'غير متوفر في المصدر — يتطلب استكمالاً',
        classification: 'confidential', readiness: 'not_ready', status: 'pending',
      });
    }

    return Response.json({
      status: 'seeded', scenario_id: SCENARIO_ID,
      nsdc_committee_id: nsdc.id, elan_committee_id: elanCommittee.id, decision_id: decision.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}