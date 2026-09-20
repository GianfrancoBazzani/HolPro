import { beforeEach, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const fake = vi.hoisted(() => {
  const rows: unknown[][] = [],
    predicates: unknown[] = [],
    locks: string[] = [],
    writes: unknown[] = [];
  const select = vi.fn(() => {
    const result = rows.shift() ?? [];
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: (p: unknown) => {
        predicates.push(p);
        return chain;
      },
      orderBy: () => chain,
      limit: () => chain,
      for: (mode: string) => {
        locks.push(mode);
        return chain;
      },
      then: Promise.resolve(result).then.bind(Promise.resolve(result)),
    };
    return chain;
  });
  const db = {
    select,
    insert: vi.fn(() => ({
      values: async (v: unknown) => {
        writes.push(v);
      },
    })),
    update: vi.fn(() => ({
      set: (v: unknown) => {
        writes.push(v);
        return { where: async () => {} };
      },
    })),
    transaction: vi.fn(),
  };
  return { db, rows, predicates, locks, writes, emit: vi.fn() };
});
vi.mock("@holpro/db", async () => ({
  ...(await import("@holpro/db/schema")),
  db: fake.db,
}));
vi.mock("../lib/plans/events", () => ({ publishEvent: fake.emit }));
import { findPlanEngagementId, listPlans, readPlan, publishPlan } from "../lib/plans/repository";
const coach = { userId: "coach", role: "coach" } as const;
const engagementId = "11111111-1111-4111-8111-111111111111",
  planId = "22222222-2222-4222-8222-222222222222";
beforeEach(() => {
  vi.clearAllMocks();
  fake.rows.length = 0;
  fake.predicates.length = 0;
  fake.locks.length = 0;
  fake.writes.length = 0;
  fake.db.transaction.mockImplementation(async (fn) => fn(fake.db));
});
it("scopes list queries and does not expose foreign versions", async () => {
  expect(await listPlans({ userId: "u", role: "coachee" })).toEqual([]);
  const query = new MySqlDialect().sqlToQuery(
    fake.predicates[0] as import("drizzle-orm").SQL,
  );
  expect(query.params).toContain("u");
  expect(query.params).toContain("active");
  expect(query.sql).toContain("deleted_at");
  await expect(readPlan(coach, planId, 1)).rejects.toThrow("not accessible");
  expect(fake.db.select).toHaveBeenCalledTimes(2);
});
it("locks ownership before the document and increments its version", async () => {
  const date = new Date("2026-09-20T12:00:00Z");
  fake.rows.push(
    [{ id: engagementId, coachId: "coach", coacheeId: "u" }],
    [{ id: planId, title: "Keep title" }],
    [{ value: 2 }],
    [{ createdAt: date }],
  );
  const result = await publishPlan(coach, {
    engagementId,
    planId,
    html: "<h1>New version</h1>",
  });
  expect(result).toEqual({
    planId,
    versionNumber: 3,
    publishedAt: date.toISOString(),
  });
  expect(fake.locks).toEqual(["update", "update"]);
  expect(fake.writes[0]).toMatchObject({
    documentId: planId,
    number: 3,
    publishedBy: "coach",
  });
  expect(fake.writes[1]).not.toHaveProperty("title");
  expect(fake.emit).toHaveBeenCalledOnce();
  const query = new MySqlDialect().sqlToQuery(
    fake.predicates[0] as import("drizzle-orm").SQL,
  );
  expect(query.params).toEqual([engagementId, "coach", "active"]);
});
it("rejects coachees and missing new titles before writing", async () => {
  await expect(
    publishPlan(
      { userId: "u", role: "coachee" },
      { engagementId, title: "T", html: "x" },
    ),
  ).rejects.toThrow();
  await expect(
    publishPlan(coach, { engagementId, html: "x" }),
  ).rejects.toThrow();
  expect(fake.db.transaction).not.toHaveBeenCalled();
});
it("emits nothing when a transaction fails", async () => {
  fake.db.transaction.mockRejectedValue(new Error("rollback"));
  await expect(
    publishPlan(coach, { engagementId, title: "T", html: "x" }),
  ).rejects.toThrow("rollback");
  expect(fake.emit).not.toHaveBeenCalled();
});
it("creates a first version and preserves immutable history", async () => {
  const date = new Date("2026-09-20T12:00:00Z");
  fake.rows.push(
    [{ id: engagementId, coachId: "coach", coacheeId: "u" }],
    [{ value: null }],
    [{ createdAt: date }],
  );
  const result = await publishPlan(coach, {
    engagementId,
    title: "Plan",
    html: "<p>First</p>",
  });
  expect(result.versionNumber).toBe(1);
  expect(fake.writes[0]).toMatchObject({
    id: result.planId,
    title: "Plan",
    createdBy: "coach",
  });
  expect(fake.writes[1]).toMatchObject({
    documentId: result.planId,
    number: 1,
    html: "<p>First</p>",
  });
  expect(fake.emit).toHaveBeenCalledOnce();
});
it("scopes historical reads in one query", async () => {
  fake.rows.push([
    {
      title: "Plan",
      versionNumber: 1,
      html: "old",
      createdAt: new Date("2026-09-20T12:00:00Z"),
    },
  ]);
  expect(
    await readPlan({ userId: "u", role: "coachee" }, planId, 1),
  ).toMatchObject({ title: "Plan", html: "old", versionNumber: 1 });
  expect(fake.db.select).toHaveBeenCalledTimes(1);
  const query = new MySqlDialect().sqlToQuery(
    fake.predicates[0] as import("drizzle-orm").SQL,
  );
  expect(query.params).toEqual([planId, "u", "active"]);
  expect(query.sql).toContain("deleted_at");
});

it("resolves plan engagements using the same visibility and ownership scope", async () => {
  fake.rows.push([{ engagementId }]);
  expect(await findPlanEngagementId({ userId: "u", role: "coachee" }, planId)).toBe(engagementId);
  const query = new MySqlDialect().sqlToQuery(fake.predicates[0] as import("drizzle-orm").SQL);
  expect(query.params).toEqual([planId, "u", "active"]);
  expect(query.sql).toContain("`plan_documents`.`deleted_at` is null");
  expect(query.sql).toContain("`plan_documents`.`current_version_id` is not null");
  expect(await findPlanEngagementId(coach, "missing")).toBeUndefined();
});
