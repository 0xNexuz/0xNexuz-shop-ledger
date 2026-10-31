/**
 * Timestamps are stored as UTC ISO strings so string order equals time order.
 * "Today" is always the shop's local day (default Africa/Lagos).
 */

export class TimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeError";
  }
}

const OFFSET_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Accept an ISO date-time that carries an offset; return normalized UTC. */
export function toUtcIso(value: string, field = "time"): string {
  if (!OFFSET_RE.test(value)) {
    throw new TimeError(`${field} must be an ISO 8601 date-time with a UTC offset.`);
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new TimeError(`${field} is not a valid date-time.`);
  return new Date(ms).toISOString();
}

export function assertDay(value: string, field = "day"): string {
  const match = DAY_RE.exec(value);
  if (!match) throw new TimeError(`${field} must be YYYY-MM-DD.`);
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) {
    throw new TimeError(`${field} is not a real calendar date.`);
  }
  return value;
}

/** Offset of `timeZone` from UTC at `utcMs`, in milliseconds. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** The local calendar day (YYYY-MM-DD) of an instant in `timeZone`. */
export function localDay(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** UTC bounds [from, to) of a local calendar day in `timeZone`. */
export function dayBoundsUtc(day: string, timeZone: string): { from: string; to: string } {
  assertDay(day);
  const [y = 0, m = 1, d = 1] = day.split("-").map(Number);
  const startOf = (year: number, month: number, date: number) => {
    const guess = Date.UTC(year, month - 1, date);
    let utc = guess - zoneOffsetMs(guess, timeZone);
    // A second pass settles days where the offset changes (DST).
    utc = guess - zoneOffsetMs(utc, timeZone);
    return utc;
  };
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return {
    from: new Date(startOf(y, m, d)).toISOString(),
    to: new Date(startOf(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate())).toISOString(),
  };
}

/** Whole days between a due date (YYYY-MM-DD) and today, positive when overdue. */
export function daysOverdue(dueDay: string, today: string): number {
  const due = Date.parse(`${assertDay(dueDay, "dueDate")}T00:00:00Z`);
  const now = Date.parse(`${assertDay(today, "today")}T00:00:00Z`);
  return Math.round((now - due) / 86_400_000);
}
