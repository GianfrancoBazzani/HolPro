const DAY = 86_400_000;
export const dayDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
export const addDays = (day: string, days: number) =>
  new Date(dayDate(day).getTime() + days * DAY).toISOString().slice(0, 10);
export const daysBetween = (start: string, end: string) =>
  Math.round((dayDate(end).getTime() - dayDate(start).getTime()) / DAY);
const weekday = (day: string) => dayDate(day).getUTCDay() || 7;
const monday = (day: string) => addDays(day, 1 - weekday(day));
const sunday = (day: string) => addDays(day, 7 - weekday(day));
export type CalendarWindow = { start: string; end: string; clipped: boolean };
type Entry = { date: string } | { startDate: string; endDate: string };
export function computeWindow(entries: Entry[], today: string): CalendarWindow {
  let first = addDays(today, -7),
    last = addDays(today, 28);
  for (const entry of entries) {
    const start = "date" in entry ? entry.date : entry.startDate;
    const end = "date" in entry ? entry.date : entry.endDate;
    if (start < first) first = start;
    if (end > last) last = end;
  }
  const start = monday(first),
    end = sunday(last);
  if (daysBetween(start, end) < 364) return { start, end, clipped: false };
  const cappedStart = addDays(monday(today), -26 * 7);
  return { start: cappedStart, end: addDays(cappedStart, 363), clipped: true };
}
export function dayColumns(window: Pick<CalendarWindow, "start" | "end">) {
  return Array.from(
    { length: daysBetween(window.start, window.end) + 1 },
    (_, i) => {
      const date = addDays(window.start, i),
        day = weekday(date);
      return {
        date,
        weekday: day,
        isWeekend: day >= 6,
        isMonday: day === 1,
        isMonthStart: date.endsWith("-01"),
      };
    },
  );
}
export function monthSpans(columns: { date: string }[]) {
  const spans: { month: string; startIndex: number; length: number }[] = [];
  columns.forEach(({ date }, index) => {
    const month = date.slice(0, 7),
      previous = spans.at(-1);
    if (previous?.month === month) previous.length++;
    else spans.push({ month, startIndex: index, length: 1 });
  });
  return spans;
}
export function todayIn(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const value = (type: string) => parts.find((p) => p.type === type)!.value;
    return `${value("year")}-${value("month")}-${value("day")}`;
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return todayIn("UTC");
  }
}
