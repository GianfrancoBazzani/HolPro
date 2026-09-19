import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  gate: vi.fn(),
  upsert: vi.fn(),
  values: vi.fn(),
  insert: vi.fn(),
  engagements: vi.fn(),
  preferences: vi.fn(),
}));
vi.mock("../lib/auth/gate", () => ({ requirePortalUser: mocks.gate }));
vi.mock("@holpro/db", async () => ({
  ...(await import("@holpro/db/schema")),
  db: {
    insert: mocks.insert,
    query: {
      engagements: { findMany: mocks.engagements },
      calendarPreferences: { findFirst: mocks.preferences },
    },
  },
}));
import { saveCalendarPreferences } from "../lib/calendar/actions";
import { loadCalendar } from "../lib/calendar/repository";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const id = "00000000-0000-4000-8000-000000000001";
const prefs = { rowOrder: [id, id], hiddenEngagements: [], hiddenKinds: [] };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.gate.mockResolvedValue({ id: "gated-user" });
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.values.mockReturnValue({ onDuplicateKeyUpdate: mocks.upsert });
  mocks.upsert.mockResolvedValue(undefined);
});
it("upserts deduplicated preferences using gated identity only", async () => {
  expect(
    await saveCalendarPreferences({ ...prefs, userId: "attacker" }),
  ).toEqual({ ok: true });
  expect(mocks.values).toHaveBeenCalledWith({
    userId: "gated-user",
    rowOrder: [id],
    hiddenEngagements: [],
    hiddenKinds: [],
  });
  expect(mocks.upsert).toHaveBeenCalledWith({
    set: { rowOrder: [id], hiddenEngagements: [], hiddenKinds: [] },
  });
});
it("returns safe failures without swallowing authentication redirects", async () => {
  expect(
    await saveCalendarPreferences({ ...prefs, rowOrder: ["bad"] }),
  ).toEqual({ ok: false });
  expect(mocks.insert).not.toHaveBeenCalled();
  mocks.upsert.mockRejectedValue(new Error("database"));
  expect(await saveCalendarPreferences(prefs)).toEqual({ ok: false });
  const redirect = new Error("NEXT_REDIRECT");
  mocks.gate.mockRejectedValue(redirect);
  await expect(saveCalendarPreferences(prefs)).rejects.toBe(redirect);
});
it("loads only active engagements of the user and returns serializable records", async () => {
  mocks.engagements.mockResolvedValue([
    {
      id: "e",
      startedAt: new Date("2026-01-01Z"),
      coach: { user: { name: "Coach" } },
      planItems: [
        {
          id,
          kind: "training",
          title: "Training",
          description: null,
          createdAt: new Date("2026-02-01Z"),
          checkpoints: [
            {
              id: "cp",
              date: "2026-09-19",
              title: "Push",
              status: "done",
              note: null,
            },
          ],
          periods: [],
        },
      ],
    },
  ]);
  mocks.preferences.mockResolvedValue({
    rowOrder: [id, "stale", id],
    hiddenEngagements: ["unknown"],
    hiddenKinds: ["training", "bogus"],
  });
  const data = await loadCalendar("owner");
  expect(data.engagements).toEqual([
    { id: "e", coachName: "Coach", startedAt: "2026-01-01T00:00:00.000Z" },
  ]);
  expect(data.items[0].createdAt).toBe("2026-02-01T00:00:00.000Z");
  expect(data.items[0].checkpoints[0].date).toBe("2026-09-19");
  expect(data.preferences).toEqual({
    rowOrder: [id],
    hiddenEngagements: [],
    hiddenKinds: ["training"],
  });
  const query = new MySqlDialect().sqlToQuery(
    mocks.engagements.mock.calls[0][0].where,
  );
  expect(query.params).toEqual(["owner", "active"]);
  expect(query.sql).toContain("coachee_id");
});
it("defaults missing preferences to empty arrays", async () => {
  mocks.engagements.mockResolvedValue([]);
  mocks.preferences.mockResolvedValue(undefined);
  expect(await loadCalendar("owner")).toEqual({
    engagements: [],
    items: [],
    preferences: { rowOrder: [], hiddenEngagements: [], hiddenKinds: [] },
  });
});
