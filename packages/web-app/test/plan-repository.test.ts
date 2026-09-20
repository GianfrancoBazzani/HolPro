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
      leftJoin: () => chain,
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
      values: (v: unknown) => {
        writes.push(v);
        return {
          onDuplicateKeyUpdate: async (u: unknown) => {
            writes.push(u);
          },
        };
      },
    })),
    update: vi.fn(() => ({
      set: (v: unknown) => {
        writes.push(v);
        return { where: async () => {} };
      },
    })),
    delete: vi.fn(() => ({ where: async () => {} })),
    transaction: vi.fn(),
  };
  return { db, rows, predicates, locks, writes, emit: vi.fn() };
});
vi.mock("@holpro/db", async () => ({
  ...(await import("@holpro/db/schema")),
  db: fake.db,
}));
vi.mock("../lib/plans/events", () => ({ publishEvent: fake.emit }));
import {
  findPlanEngagementId,
  listPlans,
  readPlan,
  submitPlanDraft,
  approvePlanDraft,
  discardPlanDraft,
  readPlanDraft,
} from "../lib/plans/repository";
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
it("submits replacement drafts without creating approved versions", async () => {
  fake.rows.push(
    [{ id: engagementId, coachId: "coach", coacheeId: "u" }],
    [{ id: planId }],
  );
  const result = await submitPlanDraft(coach, {
    engagementId,
    planId,
    html: "draft",
  });
  expect(result).toMatchObject({ planId, status: "pending_review" });
  expect(fake.locks).toEqual(["update", "update"]);
  expect(fake.writes[0]).toMatchObject({
    documentId: planId,
    html: "draft",
    title: null,
  });
  expect(fake.writes[1]).toMatchObject({ set: { html: "draft", title: null } });
  expect(fake.emit).toHaveBeenCalledWith(
    "plan.draft",
    expect.objectContaining({ planId }),
  );
});
it("rejects coachees and missing new titles before writing", async () => {
  await expect(
    submitPlanDraft(
      { userId: "u", role: "coachee" },
      { engagementId, title: "T", html: "x" },
    ),
  ).rejects.toThrow();
  await expect(
    submitPlanDraft(coach, { engagementId, html: "x" }),
  ).rejects.toThrow();
  expect(fake.db.transaction).not.toHaveBeenCalled();
});
it("emits nothing when a transaction fails", async () => {
  fake.db.transaction.mockRejectedValue(new Error("rollback"));
  await expect(
    submitPlanDraft(coach, { engagementId, title: "T", html: "x" }),
  ).rejects.toThrow("rollback");
  expect(fake.emit).not.toHaveBeenCalled();
});
it("creates an unapproved document with one draft", async () => {
  fake.rows.push([{ id: engagementId, coachId: "coach", coacheeId: "u" }]);
  const result = await submitPlanDraft(coach, {
    engagementId,
    title: "Plan",
    html: "draft",
  });
  expect(result.status).toBe("pending_review");
  expect(fake.writes[0]).toMatchObject({
    id: result.planId,
    currentVersionId: null,
  });
  expect(fake.writes[1]).toMatchObject({
    documentId: result.planId,
    html: "draft",
  });
});
function reviewRows(currentVersionId: string | null = "v1", draftId = "d1") {
  fake.rows.push(
    [{ engagementId }],
    [{ id: engagementId, coachId: "coach", coacheeId: "u" }],
    [{ id: planId, currentVersionId }],
    [{ id: draftId, html: "approved html", title: "New title" }],
  );
}
it("approves the previewed draft as the next immutable version", async () => {
  reviewRows();
  fake.rows.push([{ value: 2 }]);
  expect(await approvePlanDraft("coach", planId, "d1")).toMatchObject({
    planId,
    versionNumber: 3,
  });
  expect(fake.writes[0]).toMatchObject({
    number: 3,
    html: "approved html",
    publishedBy: "coach",
  });
  expect(fake.writes[1]).toMatchObject({ title: "New title" });
  expect(fake.db.delete).toHaveBeenCalledOnce();
  expect(fake.emit).toHaveBeenCalledWith(
    "plan.published",
    expect.objectContaining({ planId }),
  );
});
it.each([approvePlanDraft, discardPlanDraft])(
  "rejects an unseen replacement without writes",
  async (action) => {
    reviewRows();
    await expect(action("coach", planId, "old")).rejects.toThrow();
    expect(fake.writes).toEqual([]);
    expect(fake.emit).not.toHaveBeenCalled();
  },
);
it.each([null, "v1"])(
  "discards draft, soft deleting only unapproved documents (%s)",
  async (current) => {
    reviewRows(current);
    await discardPlanDraft("coach", planId, "d1");
    expect(fake.db.delete).toHaveBeenCalledOnce();
    if (current === null) expect(fake.writes[0]).toHaveProperty("deletedAt");
    else expect(fake.writes[0]).not.toHaveProperty("deletedAt");
  },
);
it("denies draft reads to coachees and foreign coaches", async () => {
  await expect(
    readPlanDraft({ userId: "u", role: "coachee" }, planId),
  ).rejects.toThrow();
  expect(fake.db.select).not.toHaveBeenCalled();
  await expect(readPlanDraft(coach, planId)).rejects.toThrow();
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
  expect(
    await findPlanEngagementId({ userId: "u", role: "coachee" }, planId),
  ).toBe(engagementId);
  const query = new MySqlDialect().sqlToQuery(
    fake.predicates[0] as import("drizzle-orm").SQL,
  );
  expect(query.params).toEqual([planId, "u", "active"]);
  expect(query.sql).toContain("`plan_documents`.`deleted_at` is null");
  expect(query.sql).toContain(
    "`plan_documents`.`current_version_id` is not null",
  );
  expect(await findPlanEngagementId(coach, "missing")).toBeUndefined();
});

it("treats an owned plan discarded in another tab as a stale review", async () => {
  fake.rows.push(
    [{ engagementId }],
    [{ id: engagementId, coachId: "coach", coacheeId: "u" }],
    [],
  );
  const { PlanDraftChangedError } = await import("../lib/plans/types");
  await expect(approvePlanDraft("coach", planId, "d1")).rejects.toBeInstanceOf(
    PlanDraftChangedError,
  );
  expect(fake.writes).toEqual([]);
});
it("omits draft metadata from coachee summaries", async () => {
  const date = new Date("2026-09-20T00:00:00Z");
  fake.rows.push([
    {
      planId,
      engagementId,
      title: "Published",
      versionNumber: 1,
      updatedAt: date,
      draftSubmittedAt: new Date(),
    },
  ]);
  const [summary] = await listPlans({ userId: "u", role: "coachee" });
  expect(summary).not.toHaveProperty("draftSubmittedAt");
  expect(summary.updatedAt).toBe(date.toISOString());
  const query = new MySqlDialect().sqlToQuery(
    fake.predicates[0] as import("drizzle-orm").SQL,
  );
  expect(query.sql).toContain(
    "`plan_documents`.`current_version_id` is not null",
  );
});
it("lists first drafts for coaches with version zero", async () => {
  const date = new Date("2026-09-20T00:00:00Z");
  fake.rows.push([
    {
      planId,
      engagementId,
      title: "Draft",
      versionNumber: null,
      updatedAt: date,
      draftSubmittedAt: date,
    },
  ]);
  expect(await listPlans(coach)).toEqual([
    {
      planId,
      engagementId,
      title: "Draft",
      versionNumber: 0,
      updatedAt: date.toISOString(),
      draftSubmittedAt: date.toISOString(),
    },
  ]);
});
it.each([approvePlanDraft, discardPlanDraft])(
  "denies review by another coach and missing drafts",
  async (action) => {
    fake.rows.push([{ engagementId }], []);
    await expect(action("stranger", planId, "d1")).rejects.toThrow();
    fake.rows.push(
      [{ engagementId }],
      [{ id: engagementId, coachId: "coach", coacheeId: "u" }],
      [{ id: planId, currentVersionId: "v1" }],
      [],
    );
    await expect(action("coach", planId, "d1")).rejects.toThrow();
    expect(fake.writes).toEqual([]);
  },
);

it("reads the next version with a locking read after waiting for another approval", async () => {
  reviewRows();
  fake.rows.push([{ value: 4 }]);
  expect(await approvePlanDraft("coach", planId, "d1")).toMatchObject({
    versionNumber: 5,
  });
  // A plain MAX query would use the snapshot established by scope discovery,
  // potentially missing a version committed while waiting on the engagement.
  expect(fake.locks.slice(0, 4)).toEqual(["update", "update", "update", "update"]);
});

it("approval completes onboarding and queues a notification for its coachee", async () => {
  reviewRows(null);
  fake.rows.push([], [{id:"request",coacheeId:"u",status:"awaiting_review"}]);
  await approvePlanDraft("coach",planId,"d1");
  expect(fake.writes).toContainEqual({status:"approved"});
  expect(fake.writes).toContainEqual(expect.objectContaining({userId:"u",requestId:"request",kind:"plan_approved",href:`/app?plan=${planId}`}));
});
it("discard marks onboarding rejected without making a plan available", async () => {
  reviewRows(null);
  fake.rows.push([{id:"request",coacheeId:"u",status:"awaiting_review"}]);
  await discardPlanDraft("coach",planId,"d1");
  expect(fake.writes).toContainEqual({status:"rejected"});
  expect(fake.writes).toContainEqual(expect.objectContaining({userId:"u",kind:"plan_rejected"}));
});
