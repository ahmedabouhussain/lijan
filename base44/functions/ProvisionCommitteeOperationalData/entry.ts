import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  planAttendance,
  planAgenda,
  buildDocumentHtml,
  buildDemonstrationSeats,
  buildReportSections,
  buildMemoryLedger,
  collectApprovedSources,
  sha256Hex,
  slugForFile,
  AGENDA_TARGET,
} from '../../shared/operationalPack.ts';
import { DEMO_MEMBER_NAMES, DEMO_INSTITUTIONS } from '../../shared/demoDataset.ts';

// ProvisionCommitteeOperationalData — makes every listed record openable and true.
//
// For each named committee it closes the four gaps that make a listed record a dead end:
//   1. a recorded attendance register for every completed meeting, with a real quorum;
//   2. a full agenda (8 items) for every meeting;
//   3. a stored document version (private file) for every document that had none;
//   4. one open review request addressed to the secretary's seat, so the review path
//      leads to a document that actually exists.
// It then produces the committee report and the institutional memory, and ONLY from
// approved content — issued decisions, closed actions, approved minutes. Where no such
// source exists it produces nothing and says so, rather than dressing up a draft.
//
// Idempotent: every step first checks what is already there, so re-running adds nothing.
// Platform-admin only — this writes governance records.

const OFFICER_ROLES = new Set(['chair', 'vice_chair', 'secretary', 'committee_administrator']);
const VOTING_ROLES = ['chair', 'vice_chair', 'secretary', 'committee_administrator', 'member'];
const MARKER = 'OPS-PACK-V1';

// A filtered read with options returns a page ({items}), never an array — normalise once
// here so every loop below reads records, not the envelope.
const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));

async function fileFromHtml(html: string, fileName: string) {
  const bytes = new TextEncoder().encode(html);
  const file = new File([bytes], fileName, { type: 'text/html' });
  return { bytes, file };
}

export default async function (req: any) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const me = await base44.auth.me().catch(() => null);
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden — platform administration only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const publicIds: string[] = Array.isArray(body.public_ids) && body.public_ids.length
      ? body.public_ids
      : [
        'DEMO-COMM-NATIONAL-SME',
        'DEMO-COMM-QDB-INNOVATION',
        'DEMO-COMM-QDB-RISK',
        'DEMO-COMM-QDB-INVESTMENT',
        'DEMO-COMM-QDB-SME-FINANCE',
        'DEMO-COMM-QDB-DIGITAL',
      ];

    const report: Array<Record<string, any>> = [];

    for (const publicId of publicIds) {
      const committee = arr(await sr.entities.Committee.filter({ public_id: publicId }).catch(() => []))[0];
      if (!committee) {
        report.push({ committee: publicId, error: 'not_found' });
        continue;
      }
      const base = {
        organization_id: committee.organization_id,
        committee_id: committee.id,
        is_demo_data: true,
        ...(committee.demo_dataset ? { demo_dataset: committee.demo_dataset } : {}),
      };

      const seats = arr(await sr.entities.CommitteeMembership
        .filter({ committee_id: committee.id })
        .catch(() => []));
      const meetings = arr(await sr.entities.Meeting
        .filter({ committee_id: committee.id })
        .catch(() => []));
      const decisions = arr(await sr.entities.Decision
        .filter({ committee_id: committee.id })
        .catch(() => []));
      const actions = arr(await sr.entities.Action
        .filter({ committee_id: committee.id })
        .catch(() => []));
      const minutesRows = arr(await sr.entities.MeetingMinutes
        .filter({ committee_id: committee.id })
        .catch(() => []));
      const documents = arr(await sr.entities.Document
        .filter({ committee_id: committee.id })
        .catch(() => []));

      const entry: Record<string, any> = {
        committee: publicId,
        attendance_created: 0,
        attendance_rebuilt: 0,
        seats_added: 0,
        minutes_synced: 0,
        agenda_created: 0,
        versions_created: 0,
        review_request: null,
        report: 'not_created',
        memory: 'not_created',
      };

      // ── 0. Composition — a register needs seats to answer for ─────────────
      let committeeSeats = seats;
      if (String(committee.public_id || '').startsWith('DEMO-')) {
        const activeVoting = committeeSeats.filter(
          (s) => (s.status || 'active') === 'active' && VOTING_ROLES.includes(s.role || 'member'),
        ).length;
        if (activeVoting < 8) {
          const added = buildDemonstrationSeats({
            existing: committeeSeats,
            roster: DEMO_MEMBER_NAMES,
            institutions: DEMO_INSTITUTIONS,
            targetVoting: 8,
            seed: publicId.length % DEMO_MEMBER_NAMES.length,
          });
          if (added.length) {
            await sr.entities.CommitteeMembership.bulkCreate(added.map((s) => ({ ...base, ...s })));
            committeeSeats = arr(await sr.entities.CommitteeMembership
              .filter({ committee_id: committee.id })
              .catch(() => []));
            entry.seats_added = added.length;
          }
        }
      }

      // ── 1 + 2. Attendance and agenda, meeting by meeting ──────────────────
      for (const meeting of meetings || []) {
        const existingAgenda = arr(await sr.entities.AgendaItem
          .filter({ meeting_id: meeting.id })
          .catch(() => []));

        const planned = planAgenda({
          meeting: { ...meeting, organization_id: base.organization_id, committee_id: base.committee_id },
          committee,
          seats: committeeSeats,
          existingCount: (existingAgenda || []).length,
          decisions: (decisions || []).filter((d) => !d.meeting_id || d.meeting_id === meeting.id),
        });
        if (planned.length) {
          await sr.entities.AgendaItem.bulkCreate(planned);
          entry.agenda_created += planned.length;
        }

        if ((meeting.status || '') !== 'completed') continue;

        const existing = arr(await sr.entities.Attendance
          .filter({ meeting_id: meeting.id })
          .catch(() => []));

        const plan = planAttendance(committeeSeats, meeting);
        const covered = existing.length >= plan.rows.length && plan.rows.length > 0;
        if (plan.rows.length && !covered) {
          // A register that omits seats is not a register: it is rebuilt to cover the
          // composition that actually sits on this committee.
          if (existing.length) {
            await sr.entities.Attendance.deleteMany({ meeting_id: meeting.id });
            entry.attendance_rebuilt += 1;
          }
          await sr.entities.Attendance.bulkCreate(
            plan.rows.map((r) => ({ ...base, ...r, meeting_id: meeting.id })),
          );
          entry.attendance_created += plan.rows.length;
        } else if (existing.length) {
          plan.present = existing.filter(
            (a) => a.attendance_status === 'present' || a.attendance_status === 'late',
          ).length;
          plan.apologies = existing.filter((a) => a.attendance_status === 'absent_with_apology').length;
          plan.absent = existing.length - plan.present - plan.apologies;
          plan.quorum_met = plan.present >= (meeting.quorum_required || 4);
        }

        // The minutes of that meeting must report the same register the members see.
        const minutesRow = (minutesRows || []).find((m) => m.meeting_id === meeting.id);
        const sync = {
          present_count: plan.present,
          absent_count: plan.absent,
          apologies_count: plan.apologies,
          quorum_met: plan.quorum_met,
          call_to_order: meeting.date || null,
        };
        if (minutesRow) {
          await sr.entities.MeetingMinutes.update(minutesRow.id, sync);
          entry.minutes_synced += 1;
        } else {
          await sr.entities.MeetingMinutes.create({
            ...base,
            meeting_id: meeting.id,
            minutes_number: `${publicId}-${String(meeting.date || '').slice(0, 10)}`,
            ...sync,
            status: 'draft',
            body: 'مسودة محضر مُولَّدة من سجل الحضور المعتمد للاجتماع.',
            body_en: 'Draft minutes generated from the approved attendance register of the meeting.',
          });
          entry.minutes_synced += 1;
        }
      }

      // ── 3. A stored version, with a real file, for every document ─────────
      for (const doc of documents || []) {
        if (doc.current_version_id) continue;
        const linkedDecision = (decisions || []).find((d) => d.id === doc.decision_id) || null;
        const html = buildDocumentHtml({
          document: doc,
          committee,
          versionNumber: 1,
          generatedBy: committee.secretary_name || committee.secretary_name_en || 'أمانة اللجنة',
          linkedDecision,
        });
        const fileName = `${slugForFile(doc.title_en || doc.title_ar || doc.title, 'document')}-v1.html`;
        const { bytes, file } = await fileFromHtml(html, fileName);
        const upload: any = await sr.integrations.Core.UploadPrivateFile({ file });
        const fileUri = upload?.file_uri || upload?.file_url;
        if (!fileUri) throw new Error(`File storage refused the version for ${doc.id}`);

        const version = await sr.entities.DocumentVersion.create({
          ...base,
          document_id: doc.id,
          version_number: 1,
          file_url: fileUri,
          file_name: fileName,
          file_size_bytes: bytes.length,
          content_hash: await sha256Hex(bytes),
          change_summary: 'الإصدار الأول من المستند — النسخة المحفوظة والخاضعة للمراجعة.',
          change_summary_ar: 'الإصدار الأول من المستند — النسخة المحفوظة والخاضعة للمراجعة.',
          uploaded_by_name: committee.secretary_name || committee.secretary_name_en || 'أمانة اللجنة',
          uploaded_at: new Date().toISOString(),
          status: 'current',
        });
        await sr.entities.Document.update(doc.id, {
          current_version_id: version.id,
          current_version_number: 1,
        });
        entry.versions_created += 1;
        doc.current_version_id = version.id;
        doc.current_version_number = 1;

        // 4. One open review request per committee, addressed to the officer seat.
        if (entry.review_request) continue;
        const officer =
          (seats || []).find((s) => s.role === 'secretary' && (s.status || 'active') === 'active') ||
          (seats || []).find((s) => OFFICER_ROLES.has(s.role) && (s.status || 'active') === 'active');
        if (!officer) continue;
        const open = arr(await sr.entities.ReviewRequest
          .filter({ document_id: doc.id, status: 'pending' })
          .catch(() => []));
        if ((open || []).length) {
          entry.review_request = 'already_open';
          continue;
        }
        const request = await sr.entities.ReviewRequest.create({
          ...base,
          document_id: doc.id,
          document_version_id: version.id,
          requested_by_name: committee.chair_name || committee.chair_name_en || 'رئاسة اللجنة',
          reviewer_name: officer.full_name || officer.full_name_ar,
          reviewer_user_id: officer.user_id || null,
          reviewer_role: officer.role || 'secretary',
          review_type: 'editorial',
          instructions: 'مراجعة الإصدار المحفوظ للمستند والتحقق من مطابقته للتصنيف وللقرار المرتبط، ثم الرفع بالتوصية.',
          due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          requested_at: new Date().toISOString(),
          status: 'pending',
        });
        entry.review_request = request.id;
      }

      // ── 5. Report and memory — approved content only ──────────────────────
      const sources = collectApprovedSources({
        decisions: decisions || [],
        actions: actions || [],
        minutes: minutesRows || [],
      });

      if (sources.total) {
        const existingReport = arr(await sr.entities.ProductInstance
          .filter({ committee_id: committee.id, product_type: 'committee_report', correlation_id: MARKER })
          .catch(() => []));
        if (!(existingReport || []).length) {
          const sections = buildReportSections(sources);
          await sr.entities.ProductInstance.create({
            ...base,
            product_type: 'committee_report',
            title: `${committee.name_en || committee.name_ar} — Committee report`,
            title_ar: `${committee.name_ar || committee.name_en} — تقرير اللجنة`,
            source_entity_type: 'Committee',
            source_entity_id: committee.id,
            source_title: committee.name_en || committee.name_ar,
            generated_content: JSON.stringify(sections),
            export_format: 'print',
            classification: 'internal',
            status: 'generated',
            generated_by_name: 'محرك التقرير المؤسسي — من محتوى معتمد فقط',
            generated_at: new Date().toISOString(),
            correlation_id: MARKER,
          });
        }
        entry.report = 'ok';

        const existingMemory = arr(await sr.entities.AIOutputLedger
          .filter({ committee_id: committee.id, output_type: 'institutional_memory' })
          .catch(() => []));
        if (!(existingMemory || []).length) {
          const memory = buildMemoryLedger(sources, committee);
          await sr.entities.AIOutputLedger.create({
            ...base,
            output_type: 'institutional_memory',
            source_entity_type: 'Committee',
            source_entity_id: committee.id,
            source_title: committee.name_en || committee.name_ar,
            source_title_en: committee.name_en || committee.name_ar,
            model_used: 'deterministic_compiler',
            prompt_summary: 'تجميع الذاكرة المؤسسية من القرارات الصادرة والإجراءات المُنجزة والمحاضر المعتمدة',
            prompt_summary_en: 'Institutional memory compiled from issued decisions, closed actions and approved minutes',
            output_summary: memory.summaryAr,
            output_summary_en: memory.summaryEn,
            structured_content: JSON.stringify(memory.structured),
            generated_at: new Date().toISOString(),
            generated_by_name: 'محرك الذاكرة المؤسسية — من محتوى معتمد فقط',
            human_reviewed: false,
            approved: false,
            status: 'generated',
          });
        }
        entry.memory = 'ok';
      } else {
        entry.report = 'no_approved_content';
        entry.memory = 'no_approved_content';
      }

      // The agenda target is a promise of the interface: report any meeting still short.
      entry.agenda_short = [];
      for (const meeting of meetings || []) {
        const rows = arr(await sr.entities.AgendaItem.filter({ meeting_id: meeting.id }).catch(() => []));
        if (rows.length < AGENDA_TARGET) {
          entry.agenda_short.push({ meeting: meeting.id, items: rows.length });
        }
      }

      report.push(entry);
    }

    return Response.json({ status: 'ok', marker: MARKER, committees: report });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}