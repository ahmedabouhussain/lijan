import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// CreateCommitteeDraftFromInstrument — creates a Committee Draft from a confirmed
// founding instrument extraction. The committee remains Draft until Governance
// Readiness Gate passes. Only works with instruments that have been human-confirmed.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { instrument_id } = body;

    if (!instrument_id) return Response.json({ error: 'instrument_id is required' }, { status: 400 });

    const instrument = await base44.asServiceRole.entities.FoundingInstrument.get(instrument_id);
    if (!instrument) return Response.json({ error: 'Instrument not found' }, { status: 404 });

    if (instrument.extraction_status !== 'confirmed') {
      return Response.json({
        error: 'Instrument extraction must be confirmed by a human reviewer before creating a committee draft',
      }, { status: 400 });
    }

    // Authority on a TRUSTED target: the committee is derived from the INSTRUMENT record itself.
    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'FoundingInstrument',
      target_id: instrument.id,
      claimed_committee_id: instrument.committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const extracted = instrument.extracted_data ? JSON.parse(instrument.extracted_data) : {};
    const committeeData = extracted.committee || {};
    const formationData = extracted.formation || {};
    const governanceData = extracted.governance || {};
    const instrumentData = extracted.instrument || {};

    // Update the existing committee with extracted data (it's already a Draft)
    const updates = {};
    if (committeeData.name_ar?.value) updates.name_ar = committeeData.name_ar.value;
    if (committeeData.name_en?.value) updates.name_en = committeeData.name_en.value;
    if (committeeData.mandate?.value) updates.mandate = committeeData.mandate.value;
    if (committeeData.powers?.value) updates.scope = committeeData.powers.value;
    if (committeeData.reporting_authority?.value) updates.reporting_requirements = committeeData.reporting_authority.value;
    if (governanceData.quorum?.value) {
      const q = parseInt(String(governanceData.quorum.value).match(/\d+/)?.[0] || '3', 10);
      updates.quorum_count = q;
    }
    if (governanceData.voting_threshold?.value) {
      const vt = String(governanceData.voting_threshold.value).toLowerCase();
      if (vt.includes('two') || vt.includes('ثلثين') || vt.includes('2/3')) updates.voting_rule = 'two_thirds';
      else if (vt.includes('unanimous') || vt.includes('إجماع')) updates.voting_rule = 'unanimous';
      else updates.voting_rule = 'simple_majority';
    }
    if (instrumentData.effective_date?.value) updates.term_start = instrumentData.effective_date.value;
    if (instrumentData.expiry_date?.value) updates.term_end = instrumentData.expiry_date.value;
    if (instrumentData.issuing_authority?.value) updates.establishing_authority = instrumentData.issuing_authority.value;
    updates.status = 'draft';
    updates.governance_complete = false;

    await base44.asServiceRole.entities.Committee.update(instrument.committee_id, updates);

    // Create initial members from formation data
    const memberEntries = [];
    if (formationData.chair?.value) memberEntries.push({ name: formationData.chair.value, role: 'chair' });
    if (formationData.deputy_chair?.value) memberEntries.push({ name: formationData.deputy_chair.value, role: 'vice_chair' });
    if (formationData.secretary?.value) memberEntries.push({ name: formationData.secretary.value, role: 'secretary' });
    if (formationData.members?.value) {
      const memberNames = Array.isArray(formationData.members.value)
        ? formationData.members.value
        : String(formationData.members.value).split(/[،,؛;\n]/).map((s) => s.trim()).filter(Boolean);
      for (const name of memberNames) {
        if (!memberEntries.some((m) => m.name === name)) {
          memberEntries.push({ name, role: 'member' });
        }
      }
    }

    for (const m of memberEntries) {
      // Check if already exists to avoid duplicates
      const existing = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id: instrument.committee_id, full_name: m.name, status: 'active' })
        .catch(() => []);
      if (existing && existing.length > 0) continue;

      await base44.asServiceRole.entities.CommitteeMembership.create({
        organization_id: auth.organization_id,
        committee_id: instrument.committee_id,
        full_name: m.name,
        role: m.role,
        authority_level: m.role === 'chair' ? 'decision' : 'decision',
        voting_right: !['observer', 'advisor'].includes(m.role),
        status: 'active',
        term_start: instrumentData.effective_date?.value || null,
      });
    }

    // Create initial formation version
    const activeMembers = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id: instrument.committee_id, status: 'active' }).catch(() => []);
    const snapshot = (activeMembers || []).map((m) => ({
      full_name: m.full_name, role: m.role, institution_name: m.institution_name,
    }));
    const chair = (activeMembers || []).find((m) => m.role === 'chair');

    // Mark any existing current versions as superseded
    const prevVersions = await base44.asServiceRole.entities.CommitteeFormationVersion
      .filter({ committee_id: instrument.committee_id, is_current: true }).catch(() => []);
    let nextVersion = 1;
    for (const v of (prevVersions || [])) {
      await base44.asServiceRole.entities.CommitteeFormationVersion.update(v.id, {
        is_current: false, status: 'superseded',
        end_date: instrumentData.effective_date?.value || new Date().toISOString().split('T')[0],
      });
      if (v.version_number >= nextVersion) nextVersion = v.version_number + 1;
    }

    const formationVersion = await base44.asServiceRole.entities.CommitteeFormationVersion.create({
      organization_id: auth.organization_id,
      committee_id: instrument.committee_id,
      version_number: nextVersion,
      effective_date: instrumentData.effective_date?.value || new Date().toISOString().split('T')[0],
      source_instrument_id: instrument_id,
      source_instrument_ref: instrument.official_reference || instrument.instrument_number || instrument.title_ar,
      reason_for_change: 'إنشاء من السند التأسيسي',
      approving_authority: instrument.issuing_authority || null,
      formation_snapshot: JSON.stringify(snapshot),
      member_count: snapshot.length,
      chair_name: chair?.full_name || null,
      is_current: true,
      status: 'active',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: instrument.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'create', entity_type: 'Committee', entity_id: instrument.committee_id,
      description: `إنشاء مسودة لجنة من السند التأسيسي: ${instrument.title_ar}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      committee_id: instrument.committee_id,
      formation_version: formationVersion.version_number,
      members_created: memberEntries.length,
      note: 'اللجنة في حالة مسودة حتى اجتياز بوابة الجاهزية الحوكمية',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}