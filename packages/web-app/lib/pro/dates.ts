import { addDays, dayDate, dayIn, monday, sunday } from "@/lib/calendar/dates";
const MINUTE = 60_000;
// Wall-clock fields of an instant in a timezone, packed as a UTC timestamp.
function wallClock(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) =>
    Number(parts.find((p) => p.type === type)!.value);
  return Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour") % 24,
    value("minute"),
    value("second"),
  );
}
const offsetAt = (instant: Date, timezone: string) =>
  wallClock(instant, timezone) - Math.floor(instant.getTime() / 1000) * 1000;
// Sample both sides of a transition. Prefer the later exact match; in a gap,
// shift forward by choosing the later candidate instead of oscillating offsets.
export function zonedToUtc(day: string, time: string, timezone: string): Date {
  const zone = safeTimezone(timezone);
  const [hours, minutes] = time.split(":").map(Number);
  const wall = dayDate(day).getTime() + (hours * 60 + minutes) * MINUTE;
  const offsets = new Set(
    [-2, -1, 0, 1, 2].map((days) =>
      offsetAt(new Date(wall + days * 86_400_000), zone),
    ),
  );
  const candidates = [...offsets].map((offset) => wall - offset);
  const exact = candidates.filter(
    (value) => wallClock(new Date(value), zone) === wall,
  );
  return new Date(Math.max(...(exact.length ? exact : candidates)));
}
export function timeIn(instant: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    }).format(instant);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return timeIn(instant, "UTC");
  }
}
export function safeTimezone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return timezone;
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return "UTC";
  }
}
export function parseMonth(value: unknown, today: string): string {
  return typeof value === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
    Number(value.slice(0, 4)) >= 1001 &&
    Number(value.slice(0, 4)) <= 9998
    ? value
    : today.slice(0, 7);
}
export function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + delta, 1))
    .toISOString()
    .slice(0, 7);
}
export function monthGrid(month: string): string[][] {
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const weeks: string[][] = [];
  for (let day = monday(first); day <= sunday(last); day = addDays(day, 7))
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)));
  return weeks;
}
export function groupByDay<T extends { startsAt: string }>(
  events: T[],
  timezone: string,
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const event of events) {
    const day = dayIn(new Date(event.startsAt), timezone);
    (groups[day] ??= []).push(event);
  }
  return groups;
}
