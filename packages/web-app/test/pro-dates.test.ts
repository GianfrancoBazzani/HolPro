import { expect, it } from "vitest";
import {
  groupByDay,
  monthGrid,
  parseMonth,
  safeTimezone,
  shiftMonth,
  timeIn,
  zonedToUtc,
} from "../lib/pro/dates";
it("builds Monday-first grids that cover the whole month", () => {
  const september = monthGrid("2026-09");
  expect(september).toHaveLength(5);
  expect(september[0]).toEqual([
    "2026-08-31",
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
    "2026-09-04",
    "2026-09-05",
    "2026-09-06",
  ]);
  expect(september.at(-1)?.at(-1)).toBe("2026-10-04");
  const june = monthGrid("2026-06");
  expect(june[0][0]).toBe("2026-06-01");
  expect(june.at(-1)?.at(-1)).toBe("2026-07-05");
  const november = monthGrid("2026-11");
  expect(november).toHaveLength(6);
  expect(november[0][0]).toBe("2026-10-26");
  expect(november[0][6]).toBe("2026-11-01");
  const february = monthGrid("2027-02");
  expect(february).toHaveLength(4);
  expect(february[0][0]).toBe("2027-02-01");
  expect(february[3][6]).toBe("2027-02-28");
});
it("shifts and parses months", () => {
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(shiftMonth("2026-09", -1)).toBe("2026-08");
  expect(parseMonth("2026-10", "2026-09-19")).toBe("2026-10");
  expect(parseMonth("2026-13", "2026-09-19")).toBe("2026-09");
  expect(parseMonth(["2026-10"], "2026-09-19")).toBe("2026-09");
  expect(parseMonth(undefined, "2026-09-19")).toBe("2026-09");
});
it("converts wall-clock times to UTC across daylight-saving changes", () => {
  expect(zonedToUtc("2026-09-19", "15:00", "Europe/Rome").toISOString()).toBe(
    "2026-09-19T13:00:00.000Z",
  );
  expect(zonedToUtc("2027-03-28", "02:30", "Europe/Rome").toISOString()).toBe(
    "2027-03-28T01:30:00.000Z",
  );
  expect(zonedToUtc("2026-10-25", "02:30", "Europe/Rome").toISOString()).toBe(
    "2026-10-25T01:30:00.000Z",
  );
  expect(zonedToUtc("2026-09-19", "15:00", "Nowhere/City").toISOString()).toBe(
    "2026-09-19T15:00:00.000Z",
  );
});
it("formats times and validates timezones", () => {
  expect(timeIn(new Date("2026-09-19T13:00:00Z"), "Europe/Rome")).toBe("15:00");
  expect(timeIn(new Date("2026-09-19T22:00:00Z"), "Europe/Rome")).toBe("00:00");
  expect(timeIn(new Date("2026-09-19T13:00:00Z"), "invalid")).toBe("13:00");
  expect(safeTimezone("Europe/Rome")).toBe("Europe/Rome");
  expect(safeTimezone("invalid")).toBe("UTC");
});
it("groups events by day in a timezone and keeps input order", () => {
  const events = [
    { id: "a", startsAt: "2026-09-19T06:30:00.000Z" },
    { id: "b", startsAt: "2026-09-19T07:30:00.000Z" },
  ];
  expect(groupByDay(events, "America/Los_Angeles")).toEqual({
    "2026-09-18": [events[0]],
    "2026-09-19": [events[1]],
  });
  expect(groupByDay(events, "Asia/Tokyo")).toEqual({
    "2026-09-19": events,
  });
});

it("chooses the later instant in American DST transitions and rejects unsafe months", () => {
  expect(
    zonedToUtc("2026-11-01", "01:30", "America/New_York").toISOString(),
  ).toBe("2026-11-01T06:30:00.000Z");
  expect(
    zonedToUtc("2026-03-08", "02:30", "America/New_York").toISOString(),
  ).toBe("2026-03-08T07:30:00.000Z");
  expect(parseMonth("0000-01", "2026-09-19")).toBe("2026-09");
  expect(parseMonth("9999-12", "2026-09-19")).toBe("2026-09");
});
