import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  resolvePrincipal,
  authorizeRead,
  projectBundle,
  refusalBody,
  refusalStatus,
} from '../../shared/governedReadPolicy.ts';
import { COMMITTEE_REGISTERS, loadRegister } from '../../shared/committeeRegisters.ts';

// ListCommitteeRegister — the governed LIST read for a committee's registers.
//
// Every register surface (documents, traceability, audit) reads through here, in the same
// scope and through the same decision as the detail read (GetCommitteeRecord). Authority is
// never read from the payload: the principal comes from the authenticated session or a
// server-issued showcase session; committee_id only names the resource being asked for.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { committee_id, registers, showcase_token } = body || {};

    if (typeof committee_id !== 'string' || !committee_id) {
      return Response.json({ error: 'committee_id is required', code: 'invalid_request' }, { status: 400 });
    }
    const requested = Array.isArray(registers) ? registers : [registers];
    const keys = [...new Set(requested.filter((k: any) => typeof k === 'string' && COMMITTEE_REGISTERS[k]))].slice(0, 5);
    if (!keys.length) {
      return Response.json({ error: 'Unsupported register', code: 'unsupported_type' }, { status: 400 });
    }

    const callerUser = await base44.auth.me().catch(() => null);
    const principal = await resolvePrincipal({ sr, body: { showcase_token }, callerUser });
    const decision: any = await authorizeRead({ base44, sr, principal, record: { committee_id } });
    if (!decision.allowed) {
      return Response.json(refusalBody(decision.reason), { status: refusalStatus(decision.reason) });
    }

    const ctx = { rank: decision.read_rank, actorId: decision.actor?.id, showcase: decision.is_demo_mode === true };
    const out: Record<string, any> = {};
    const withheld: string[] = [];
    for (const key of keys) {
      if ((ctx.rank || 0) < COMMITTEE_REGISTERS[key].minRank) {
        withheld.push(key);
        continue;
      }
      const page = await loadRegister(sr, key, decision.committee.id);
      const projected = projectBundle({ items: page.items }, ctx);
      out[key] = { items: projected.values.items, count: page.items.length, has_more: page.has_more };
    }

    return Response.json({
      committee_id: decision.committee.id,
      my_role: decision.role,
      read_rank: decision.read_rank,
      is_demo_mode: decision.is_demo_mode,
      data_class: decision.data_class,
      registers: out,
      withheld_registers: withheld,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}