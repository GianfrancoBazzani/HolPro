import { expect, it, vi } from "vitest";
const queries = vi.hoisted(() => ({
  engagements: { findMany: vi.fn(), findFirst: vi.fn() },
  agendaEvents: { findMany: vi.fn() },
  calendarPreferences: { findFirst: vi.fn() },
}));
vi.mock("@holpro/db", async () => ({
  ...(await import("@holpro/db/schema")),
  db: { query: queries },
}));
import { loadClients, loadClientPlan, loadAgenda } from "../lib/pro/repository";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const dialect = new MySqlDialect();
it("rejects invalid and foreign client ids", async () => {
  expect(await loadClientPlan("coach", "bad")).toBeUndefined();
  expect(queries.engagements.findFirst).not.toHaveBeenCalled();
  queries.engagements.findFirst.mockResolvedValue(undefined);
  expect(
    await loadClientPlan("coach", "11111111-1111-4111-8111-111111111111"),
  ).toBeUndefined();
  const query = dialect.sqlToQuery(
    queries.engagements.findFirst.mock.calls[0][0].where,
  );
  expect(query.params).toContain("coach");
  expect(query.params).toContain("active");
});
it("scopes active clients to the gated coach", async () => {
  queries.engagements.findMany.mockResolvedValue([]);
  expect(await loadClients("coach")).toEqual([]);
  expect(
    dialect.sqlToQuery(queries.engagements.findMany.mock.calls[0][0].where)
      .params,
  ).toEqual(["coach", "active"]);
});
it("queries UTC grid boundaries and groups events in the coach timezone", async () => {
  queries.agendaEvents.findMany.mockResolvedValue([
    {
      id: "a",
      coachId: "coach",
      engagementId: null,
      engagement: null,
      kind: "call",
      title: "A",
      startsAt: new Date("2026-09-19T00:30:00Z"),
      durationMinutes: 60,
      note: null,
    },
  ]);
  const data = await loadAgenda("coach", "2026-09", "America/Los_Angeles");
  expect(data.events["2026-09-18"][0].id).toBe("a");
  const q = dialect.sqlToQuery(
    queries.agendaEvents.findMany.mock.calls[0][0].where,
  );
  expect(q.params[0]).toBe("coach");
  expect(q.params).toContain("2026-08-31 07:00:00.000");
  expect(q.params).toContain("2026-10-05 07:00:00.000");
});
