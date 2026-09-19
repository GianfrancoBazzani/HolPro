import { expect, it } from "vitest";
import { calendarPreferencesSchema } from "../lib/calendar/schemas";
const id = "00000000-0000-4000-8000-000000000001";
const empty = { rowOrder: [], hiddenEngagements: [], hiddenKinds: [] };
it("rejects invalid ids, kinds and unbounded payloads", () => {
  for (const input of [
    { ...empty, rowOrder: ["bad"] },
    { ...empty, hiddenEngagements: ["bad"] },
    { ...empty, hiddenKinds: ["bad"] },
    ...Object.keys(empty).map((key) => ({
      ...empty,
      [key]: Array(501).fill(key === "hiddenKinds" ? "training" : id),
    })),
  ])
    expect(calendarPreferencesSchema.safeParse(input).success).toBe(false);
});
it("deduplicates each array", () => {
  expect(
    calendarPreferencesSchema.parse({
      rowOrder: [id, id],
      hiddenEngagements: [id, id],
      hiddenKinds: ["training", "training"],
    }),
  ).toEqual({
    rowOrder: [id],
    hiddenEngagements: [id],
    hiddenKinds: ["training"],
  });
});
