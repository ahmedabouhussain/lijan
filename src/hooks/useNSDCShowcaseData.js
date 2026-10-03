import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { SCENARIO_ID } from '@/lib/nsdcPersona';

// Loads every record of the NSDC showcase scenario once. Small, fixed dataset — a single
// pass of scoped filter() calls, not a page-by-page load.
export function useNSDCShowcaseData() {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [committees, meetings, agendaItems, initiatives, evidence, decisions, memberships] = await Promise.all([
          base44.entities.Committee.filter({ demo_dataset: SCENARIO_ID }),
          base44.entities.Meeting.filter({}, { sort: '-date', limit: 20 }),
          base44.entities.AgendaItem.filter({}, { limit: 50 }),
          base44.entities.Initiative.filter({ demo_scenario_id: SCENARIO_ID }, { sort: 'sequence', limit: 20 }),
          base44.entities.EvidenceSubmissionEntry.filter({ demo_scenario_id: SCENARIO_ID }, { limit: 100 }),
          base44.entities.Decision.filter({}, { limit: 20 }),
          base44.entities.CommitteeMembership.filter({ demo_dataset: SCENARIO_ID }, { limit: 20 }),
        ]);

        const nsdc = committees.find((c) => c.slug === 'nsdc-sme-committee-demo');
        const elan = committees.find((c) => c.slug === 'elan-executive-committee-demo');
        const nsdcMeetings = (meetings.items || meetings).filter((m) => m.committee_id === nsdc?.id);
        const elanMeetings = (meetings.items || meetings).filter((m) => m.committee_id === elan?.id);
        const items = agendaItems.items || agendaItems;

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            data: {
              nsdc, elan,
              nsdcMeeting: nsdcMeetings[0],
              elanMeeting: elanMeetings[0],
              elanAgendaItems: items.filter((a) => a.committee_id === elan?.id).sort((a, b) => a.sequence - b.sequence),
              nsdcAgendaItems: items.filter((a) => a.committee_id === nsdc?.id),
              initiatives: initiatives.items || initiatives,
              evidence: evidence.items || evidence,
              decision: (decisions.items || decisions).find((d) => d.committee_id === nsdc?.id),
              hamadMembershipNSDC: memberships.find((m) => m.committee_id === nsdc?.id),
              hamadMembershipELAN: memberships.find((m) => m.committee_id === elan?.id),
            },
          });
        }
      } catch (error) {
        if (!cancelled) setState({ loading: false, error, data: null });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}