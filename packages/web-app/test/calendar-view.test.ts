import { expect, it } from "vitest";
import {
  orderRows,
  visibleRows,
  moveRow,
  stackPeriods,
} from "../lib/calendar/view";
const rows = [
  {
    id: "a",
    engagementId: "e1",
    kind: "training",
    startedAt: "2026-01-01",
    createdAt: "2026-02-01",
  },
  {
    id: "b",
    engagementId: "e2",
    kind: "nutrition",
    startedAt: "2026-01-02",
    createdAt: "2026-01-01",
  },
  {
    id: "c",
    engagementId: "e1",
    kind: "mindset",
    startedAt: "2026-01-01",
    createdAt: "2026-01-01",
  },
];
it("ignores stale and duplicate ids, appending new items chronologically", () => {
  expect(orderRows(rows, ["b", "unknown", "b"]).map((r) => r.id)).toEqual([
    "b",
    "c",
    "a",
  ]);
});
it("combines engagement and kind filters", () => {
  expect(
    visibleRows(rows, { engagements: ["e2", "stale"], kinds: ["mindset"] }).map(
      (r) => r.id,
    ),
  ).toEqual(["a"]);
});
it("swaps nearest visible neighbours without moving hidden positions", () => {
  expect(moveRow(["a", "b", "c"], ["a", "c"], "c", "up")).toEqual([
    "c",
    "b",
    "a",
  ]);
  expect(moveRow(["a", "b", "c"], ["a", "c"], "a", "down")).toEqual([
    "c",
    "b",
    "a",
  ]);
  for (const [id, direction] of [
    ["a", "up"],
    ["c", "down"],
    ["b", "up"],
  ] as const)
    expect(moveRow(["a", "b", "c"], ["a", "c"], id, direction)).toEqual([
      "a",
      "b",
      "c",
    ]);
  expect(moveRow(["a"], ["a"], "a", "down")).toEqual(["a"]);
});
it("stacks inclusive overlaps and clips periods at either edge", () => {
  const periods = [
    { id: "a", startDate: "2026-08-01", endDate: "2026-09-03" },
    { id: "b", startDate: "2026-09-03", endDate: "2026-10-01" },
    { id: "c", startDate: "2026-09-04", endDate: "2026-09-05" },
    { id: "d", startDate: "2027-01-01", endDate: "2027-02-01" },
  ];
  expect(
    stackPeriods(periods, { start: "2026-09-01", end: "2026-09-07" }).map(
      (p) => [
        p.id,
        p.lane,
        p.startIndex,
        p.endIndex,
        p.clippedStart,
        p.clippedEnd,
      ],
    ),
  ).toEqual([
    ["a", 0, 0, 2, true, false],
    ["b", 1, 2, 6, false, true],
    ["c", 0, 3, 4, false, false],
  ]);
});
