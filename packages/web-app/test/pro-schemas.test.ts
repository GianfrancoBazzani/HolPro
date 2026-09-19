import { expect, it } from "vitest";
import {
  eventSchema,
  itemSchema,
  checkpointSchema,
  periodSchema,
} from "../lib/pro/schemas";
import { parseForm } from "../lib/pro/form";
import { getDictionary } from "../lib/i18n/dictionary";
const id = "11111111-1111-4111-8111-111111111111";
const event = {
  title: " Call ",
  kind: "call",
  engagementId: "",
  date: "2026-09-19",
  time: "15:00",
  durationMinutes: "60",
  note: " ",
};
it("normalizes event fields and rejects invalid dates, times, durations and ids", () => {
  expect(eventSchema.parse(event)).toMatchObject({
    title: "Call",
    engagementId: null,
    note: null,
    durationMinutes: 60,
  });
  for (const patch of [
    { title: " " },
    { title: "a".repeat(121) },
    { note: "a".repeat(2001) },
    { date: "2026-02-30" },
    { date: "0000-01-01" },
    { time: "24:00" },
    { durationMinutes: "4" },
    { durationMinutes: "1441" },
    { durationMinutes: "5.5" },
    { kind: "bad" },
    { id: "bad" },
    { engagementId: "bad" },
  ])
    expect(eventSchema.safeParse({ ...event, ...patch }).success).toBe(false);
});
it("requires an owned target or parent and validates plan fields", () => {
  expect(itemSchema.safeParse({ kind: "training", title: "A" }).success).toBe(
    false,
  );
  expect(
    itemSchema.parse({
      engagementId: id,
      kind: "training",
      title: " A ",
      description: "",
    }),
  ).toMatchObject({ title: "A", description: null });
  expect(
    itemSchema.safeParse({ id, kind: "invalid", title: "A" }).success,
  ).toBe(false);
  expect(
    checkpointSchema.safeParse({
      itemId: id,
      title: "A",
      date: "2026-09-19",
      status: "done",
    }).success,
  ).toBe(true);
  expect(
    checkpointSchema.safeParse({
      itemId: id,
      title: "A",
      date: "2026-09-19",
      status: "invalid",
    }).success,
  ).toBe(false);
  expect(
    periodSchema.safeParse({
      itemId: id,
      title: "A",
      startDate: "2026-09-20",
      endDate: "2026-09-19",
    }).success,
  ).toBe(false);
  expect(
    periodSchema.safeParse({
      id,
      title: "A",
      startDate: "2026-09-19",
      endDate: "2026-09-19",
    }).success,
  ).toBe(true);
});
it("returns translated field errors", async () => {
  const form = new FormData();
  Object.entries({ ...event, title: "" }).forEach(([k, v]) => form.set(k, v));
  const result = parseForm(eventSchema, form, await getDictionary("it"));
  expect(result).toHaveProperty("fields.title");
  if ("fields" in result)
    expect(result.fields.title?.[0]).toBe("Inserisci un titolo.");
});
