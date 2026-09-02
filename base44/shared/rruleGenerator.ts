// RFC 5545 RRULE generator — supports DAILY, WEEKLY, MONTHLY frequencies
// with INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY.
// Designed for committee meeting cadences (weekly, biweekly, monthly, quarterly).

export interface ParsedRRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  count?: number;
  until?: Date;
  byDay?: number[];   // 0=Sun..6=Sat
  byMonthDay?: number[];
}

const DAY_MAP: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const DAY_REV: Record<number, string> = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' };

export function parseRRule(rrule: string): ParsedRRule | null {
  if (!rrule) return null;
  const clean = rrule.replace(/^RRULE:/i, '');
  const parts = clean.split(';').filter(Boolean);
  const map: Record<string, string> = {};
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx > 0) map[p.slice(0, idx).toUpperCase()] = p.slice(idx + 1);
  }
  return {
    freq: (map.FREQ as ParsedRRule['freq']) || 'WEEKLY',
    interval: map.INTERVAL ? parseInt(map.INTERVAL, 10) : 1,
    count: map.COUNT ? parseInt(map.COUNT, 10) : undefined,
    until: map.UNTIL ? new Date(map.UNTIL.replace(/(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/, (_, y, mo, d, h = '00', mi = '00', s = '00') => `${y}-${mo}-${d}T${h}:${mi}:${s}Z`)) : undefined,
    byDay: map.BYDAY ? map.BYDAY.split(',').map(d => DAY_MAP[d]).filter(d => d !== undefined) : undefined,
    byMonthDay: map.BYMONTHDAY ? map.BYMONTHDAY.split(',').map(Number) : undefined,
  };
}

export function buildRRule(params: {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  count?: number;
  until?: Date;
  byDay?: number[];
  byMonthDay?: number[];
}): string {
  const parts = [`FREQ=${params.freq}`, `INTERVAL=${params.interval || 1}`];
  if (params.count) parts.push(`COUNT=${params.count}`);
  if (params.until) {
    const u = params.until;
    parts.push(`UNTIL=${u.getUTCFullYear()}${String(u.getUTCMonth() + 1).padStart(2, '0')}${String(u.getUTCDate()).padStart(2, '0')}T${String(u.getUTCHours()).padStart(2, '0')}${String(u.getUTCMinutes()).padStart(2, '0')}00Z`);
  }
  if (params.byDay?.length) parts.push(`BYDAY=${params.byDay.map(d => DAY_REV[d]).join(',')}`);
  if (params.byMonthDay?.length) parts.push(`BYMONTHDAY=${params.byMonthDay.join(',')}`);
  return `RRULE:${parts.join(';')}`;
}

export function generateOccurrences(
  startDate: Date,
  rrule: string,
  horizon: Date,
  maxCount: number = 200
): Date[] {
  const parsed = parseRRule(rrule);
  if (!parsed) return [new Date(startDate)];

  const occurrences: Date[] = [];
  const limit = parsed.count || maxCount;
  const until = parsed.until && parsed.until < horizon ? parsed.until : horizon;

  const baseTime = { h: startDate.getHours(), m: startDate.getMinutes(), s: startDate.getSeconds() };

  function setTime(d: Date): Date {
    d.setHours(baseTime.h, baseTime.m, baseTime.s, 0);
    return d;
  }

  if (parsed.freq === 'DAILY') {
    let current = new Date(startDate);
    let n = 0;
    while (n < limit && current <= until) {
      occurrences.push(new Date(current));
      n++;
      current = new Date(current);
      current.setDate(current.getDate() + parsed.interval);
      setTime(current);
    }
  } else if (parsed.freq === 'WEEKLY') {
    const days = parsed.byDay?.length ? parsed.byDay.sort((a, b) => a - b) : [startDate.getDay()];
    let weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday start of week
    setTime(weekStart);
    let n = 0;
    let weekOffset = 0;
    while (n < limit) {
      for (const day of days) {
        const occ = new Date(weekStart);
        occ.setDate(weekStart.getDate() + day);
        setTime(occ);
        if (occ < startDate) continue;
        if (occ > until) { n = limit; break; }
        if (n < limit) { occurrences.push(new Date(occ)); n++; }
      }
      if (n >= limit) break;
      weekOffset += parsed.interval;
      weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + weekOffset * 7);
      setTime(weekStart);
      if (weekStart > until && occurrences.length > 0) break;
    }
  } else if (parsed.freq === 'MONTHLY') {
    let current = new Date(startDate);
    let n = 0;
    let monthOffset = 0;
    while (n < limit) {
      const occ = new Date(startDate.getFullYear(), startDate.getMonth() + monthOffset, 1);
      const targetDay = parsed.byMonthDay?.length ? parsed.byMonthDay[0] : startDate.getDate();
      occ.setDate(Math.min(targetDay, getDaysInMonth(occ.getFullYear(), occ.getMonth())));
      setTime(occ);
      if (occ >= startDate && occ <= until) {
        occurrences.push(new Date(occ));
        n++;
      } else if (occ > until) break;
      monthOffset += parsed.interval;
      if (monthOffset > 600) break; // safety
    }
  } else {
    return [new Date(startDate)];
  }

  return occurrences;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Convenience: map recurrence_type enum to RRULE params
export function buildRRuleFromConfig(config: {
  recurrence_type: string;
  recurrence_interval: number;
  recurrence_count?: number;
  recurrence_until?: string;
  recurrence_days_of_week?: string;
  recurrence_month_day?: number;
}): string | null {
  if (!config.recurrence_type || config.recurrence_type === 'none') return null;
  const freqMap: Record<string, string> = {
    daily: 'DAILY',
    weekly: 'WEEKLY',
    monthly: 'MONTHLY',
    quarterly: 'MONTHLY',
  };
  const freq = freqMap[config.recurrence_type] as 'DAILY' | 'WEEKLY' | 'MONTHLY';
  if (!freq) return null;

  const interval = config.recurrence_type === 'quarterly'
    ? (config.recurrence_interval || 1) * 3
    : config.recurrence_interval || 1;

  return buildRRule({
    freq,
    interval,
    count: config.recurrence_count,
    until: config.recurrence_until ? new Date(config.recurrence_until) : undefined,
    byDay: config.recurrence_days_of_week
      ? config.recurrence_days_of_week.split(',').map(Number).filter(n => !isNaN(n))
      : undefined,
    byMonthDay: config.recurrence_month_day ? [config.recurrence_month_day] : undefined,
  });
}