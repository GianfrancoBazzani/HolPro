import { beforeEach, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const fake = vi.hoisted(() => {
  const rows: unknown[][] = [],
    writes: { table: unknown; value: unknown }[] = [],
    predicates: unknown[] = [];
  const db = {
    select: vi.fn(() => {
      const result = rows.shift() ?? [];
      const q = {
        from: () => q,
        innerJoin: () => q,
        leftJoin: () => q,
        where: (p: unknown) => {
          predicates.push(p);
          return q;
        },
        limit: () => q,
        orderBy: () => q,
        for: () => q,
        then: Promise.resolve(result).then.bind(Promise.resolve(result)),
      };
      return q;
    }),
    insert: (table: unknown) => ({
      values: async (value: unknown) => {
        writes.push({ table, value });
      },
    }),
    update: (table: unknown) => ({
      set: (value: unknown) => ({
        where: async (p: unknown) => {
          predicates.push(p);
          writes.push({ table, value });
        },
      }),
    }),
    transaction: vi.fn(),
  };
  return { db, rows, writes, predicates };
});
vi.mock("@holpro/db", async () => ({
  ...(await import("@holpro/db/schema")),
  db: fake.db,
}));
import {
  requestOnboarding,
  completeOnboarding,
  claimOnboarding,
} from "../lib/onboarding/repository";
import {
  engagements,
  onboardingRequests,
  planDocuments,
  planDocumentDrafts,
  notifications,
} from "@holpro/db";
const coachId = "11111111-1111-4111-8111-111111111111";
const actor = { userId: "u", role: "coachee" } as const;
beforeEach(() => {
  fake.rows.length = 0;
  fake.writes.length = 0;
  fake.predicates.length = 0;
  fake.db.transaction.mockImplementation((fn) => fn(fake.db));
});
it("rejects a coach caller without writing", async () => {
  await expect(
    requestOnboarding({ userId: "c", role: "coach" }, coachId),
  ).rejects.toThrow();
  expect(fake.writes).toEqual([]);
});
it("returns an existing request without creating another customer or job", async () => {
  fake.rows.push(
    [{ id: "u" }],
    [{ id: "r", engagementId: "e", coachId, status: "awaiting_review" }],
  );
  expect(await requestOnboarding(actor, coachId)).toMatchObject({
    id: "r",
    status: "awaiting_review",
  });
  expect(fake.writes).toEqual([]);
});
it("does not create a relationship when the coach is unavailable", async () => {
  fake.rows.push([{ id: "u" }], [], []);
  await expect(requestOnboarding(actor, coachId)).rejects.toThrow(
    "coach_unavailable",
  );
  expect(fake.writes).toEqual([]);
});
it("requires saved goals before creating a customer", async () => {
  fake.rows.push([{ id: "u" }], [], [{ id: coachId }], []);
  await expect(requestOnboarding(actor, coachId)).rejects.toThrow(
    "goals_required",
  );
  expect(fake.writes).toEqual([]);
});
it("persists the selected coach, goals snapshot and new relationship together", async () => {
  fake.rows.push(
    [{ id: "u" }],
    [],
    [{ id: coachId }],
    [{ goals: "Already answered", summary: "Goal" }],
    [],
  );
  const result = await requestOnboarding(actor, coachId);
  expect(result.status).toBe("requested");
  expect(fake.writes.find((w) => w.table === engagements)?.value).toMatchObject(
    { coachId, coacheeId: "u" },
  );
  expect(
    fake.writes.find((w) => w.table === onboardingRequests)?.value,
  ).toMatchObject({
    coachId,
    coacheeId: "u",
    goals: "Already answered",
    status: "requested",
  });
});
it("does not commit a draft from an expired worker lease", async () => {
  fake.rows.push([{ id: "e", status: "active" }], []);
  expect(
    await completeOnboarding(
      { id: "r", engagementId: "e", leaseToken: "old" },
      { title: "Plan", html: "<p>Draft</p>" },
    ),
  ).toBe(false);
  expect(fake.writes).toEqual([]);
});
it("atomically saves a private draft and notifies only the selected coach", async () => {
  fake.rows.push(
    [{ id: "e", status: "active" }],
    [
      {
        id: "r",
        engagementId: "e",
        coachId,
        coacheeId: "u",
        leaseToken: "lease",
      },
    ],
  );
  expect(
    await completeOnboarding(
      { id: "r", engagementId: "e", leaseToken: "lease" },
      { title: "Plan", html: "<p>Draft</p>" },
    ),
  ).toBe(true);
  expect(
    fake.writes.find((w) => w.table === planDocuments)?.value,
  ).toMatchObject({
    currentVersionId: null,
    createdBy: coachId,
    engagementId: "e",
  });
  expect(
    fake.writes.find((w) => w.table === planDocumentDrafts)?.value,
  ).toMatchObject({ html: "<p>Draft</p>", submittedBy: coachId });
  expect(
    fake.writes.find((w) => w.table === notifications)?.value,
  ).toMatchObject({ userId: coachId, kind: "draft_ready" });
});
it("claims queued or expired jobs using a locking query and a new lease", async () => {
  fake.rows.push([{ id: "r", attempts: 1 }]);
  const job = await claimOnboarding();
  expect(job).toMatchObject({ id: "r", attempts: 2 });
  expect(job?.leaseToken).toBeTruthy();
  const query = new MySqlDialect().sqlToQuery(
    fake.predicates[0] as import("drizzle-orm").SQL,
  );
  expect(query.params).toContain("requested");
  expect(query.params).toContain("preparing");
});
