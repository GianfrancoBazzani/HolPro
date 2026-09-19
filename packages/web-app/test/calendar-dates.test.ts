import { afterEach, expect, it, vi } from "vitest";
import {
  addDays,
  computeWindow,
  dayColumns,
  monthSpans,
  todayIn,
} from "../lib/calendar/dates";
afterEach(() => vi.useRealTimers());
it("anchors empty windows to whole weeks", () => {
  expect(computeWindow([], "2026-09-19")).toEqual({
    start: "2026-09-07",
    end: "2026-10-18",
    clipped: false,
  });
  expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
});
it("includes entries and caps distant entries at 52 weeks", () => {
  expect(
    computeWindow(
      [
        { date: "2026-08-01" },
        { startDate: "2026-10-01", endDate: "2026-11-03" },
      ],
      "2026-09-19",
    ),
  ).toEqual({ start: "2026-07-27", end: "2026-11-08", clipped: false });
  const window = computeWindow(
    [{ date: "2020-01-01" }, { date: "2030-01-01" }],
    "2026-09-19",
  );
  expect(window).toEqual({
    start: "2026-03-16",
    end: "2027-03-14",
    clipped: true,
  });
  expect(dayColumns(window)).toHaveLength(364);
});
it("splits month labels and marks Mondays and weekends", () => {
  const columns = dayColumns({ start: "2026-08-31", end: "2026-09-06" });
  expect(columns[0]).toEqual({
    date: "2026-08-31",
    weekday: 1,
    isWeekend: false,
    isMonday: true,
    isMonthStart: false,
  });
  expect(columns[1].isMonthStart).toBe(true);
  expect(columns[6].isWeekend).toBe(true);
  expect(monthSpans(columns)).toEqual([
    { month: "2026-08", startIndex: 0, length: 1 },
    { month: "2026-09", startIndex: 1, length: 6 },
  ]);
});
it("computes today on both sides of midnight and falls back to UTC", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-19T00:30:00Z"));
  expect(todayIn("America/Los_Angeles")).toBe("2026-09-18");
  expect(todayIn("Asia/Tokyo")).toBe("2026-09-19");
  expect(todayIn("invalid")).toBe("2026-09-19");
});
it("maps instants across midnight with UTC fallback", async () => {
  const { dayIn, monday, sunday } = await import("../lib/calendar/dates");
  expect(dayIn(new Date("2026-09-19T00:30:00Z"), "America/Los_Angeles")).toBe(
    "2026-09-18",
  );
  expect(dayIn(new Date("2026-09-19T00:30:00Z"), "Asia/Tokyo")).toBe(
    "2026-09-19",
  );
  expect(dayIn(new Date("2026-09-19T00:30:00Z"), "invalid")).toBe("2026-09-19");
  expect(monday("2026-09-19")).toBe("2026-09-14");
  expect(sunday("2026-09-14")).toBe("2026-09-20");
});
