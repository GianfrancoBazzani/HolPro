import { beforeEach, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { SQL } from "drizzle-orm";
const fake = vi.hoisted(() => {
  const rows: unknown[][] = [],
    predicates: unknown[] = [],
    locks: string[] = [];
  const writes: {
    table: unknown;
    value: Record<string, unknown>;
    kind: string;
  }[] = [];
  const committed: typeof writes = [];
  const db = {
    select: vi.fn(() => {
      const result = rows.shift() ?? [];
      const chain = {
        from: () => chain,
        innerJoin: () => chain,
        where: (p: unknown) => {
          predicates.push(p);
          return chain;
        },
        limit: () => chain,
        for: (mode: string) => {
          locks.push(mode);
          return chain;
        },
        then: Promise.resolve(result).then.bind(Promise.resolve(result)),
      };
      return chain;
    }),
    insert: (table: unknown) => ({
      values: (value: Record<string, unknown>) => {
        writes.push({ table, value, kind: "insert" });
        return {
          onDuplicateKeyUpdate: async ({
            set,
          }: {
            set: Record<string, unknown>;
          }) => {
            writes.push({ table, value: set, kind: "upsert" });
          },
        };
      },
    }),
    update: (table: unknown) => ({
      set: (value: Record<string, unknown>) => ({
        where: async () => {
          writes.push({ table, value, kind: "update" });
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: async () => {
        writes.push({ table, value: {}, kind: "delete" });
      },
    }),
    transaction: vi.fn(),
  };
  return { db, rows, predicates, locks, writes, committed, emit: vi.fn() };
});
vi.mock("@holpro/db", async () => ({
  ...(await import("@holpro/db/schema")),
  db: fake.db,
}));
vi.mock("../lib/plans/events", () => ({ publishEvent: fake.emit }));
import {
  planChangeDrafts,
  planItems,
  planCheckpoints,
  planPeriods,
} from "@holpro/db/schema";
import {
  submitCalendarDraft,
  readCalendarDraft,
  applyCalendarDraft,
  discardCalendarDraft,
} from "../lib/calendar/draft-repository";
import { PlanAccessError, PlanDraftChangedError } from "../lib/plans/types";
const engagementId = "11111111-1111-4111-8111-111111111111",
  id = "22222222-2222-4222-8222-222222222222";
const childId = "33333333-3333-4333-8333-333333333333";
const coach = { userId: "coach", role: "coach" } as const;
const engagement = { id: engagementId, coachId: "coach", coacheeId: "client" };
const create = {
  op: "createItem",
  tempId: "base",
  title: "Strength",
  kind: "training",
} as const;
beforeEach(() => {
  vi.clearAllMocks();
  for (const list of [
    fake.rows,
    fake.predicates,
    fake.locks,
    fake.writes,
    fake.committed,
  ])
    list.length = 0;
  fake.db.transaction.mockImplementation(async (fn) => {
    const result = await fn(fake.db);
    fake.committed.push(...fake.writes);
    return result;
  });
});
function review(operations: unknown, draftId = "draft") {
  fake.rows.push([engagement], [{ id: draftId, operations }]);
}
const query = (n: number) =>
  new MySqlDialect().sqlToQuery(fake.predicates[n] as SQL);
it("replaces the single draft with a new review identity and does not write live rows", async () => {
  fake.rows.push([engagement], [engagement]);
  const first = await submitCalendarDraft(coach, {
    engagementId,
    operations: [create],
  });
  const second = await submitCalendarDraft(coach, {
    engagementId,
    operations: [{ ...create, title: "Replacement" }],
  });
  expect(first.draftId).not.toBe(second.draftId);
  expect(second).toMatchObject({
    engagementId,
    status: "pending_review",
    operationCount: 1,
  });
  expect(fake.writes.every((w) => w.table === planChangeDrafts)).toBe(true);
  expect(fake.writes.at(-1)).toMatchObject({
    kind: "upsert",
    value: {
      id: second.draftId,
      operations: [{ ...create, title: "Replacement" }],
    },
  });
  expect(query(0).params).toEqual([engagementId, "coach", "active"]);
  expect(fake.emit).toHaveBeenCalledWith("plan.draft", {
    planId: null,
    engagementId,
    coachId: "coach",
    coacheeId: "client",
  });
});
it("resolves a newly created item for checkpoints and periods", async () => {
  review([
    create,
    {
      op: "createCheckpoint",
      itemRef: "base",
      title: "Review",
      date: "2026-09-20",
    },
    {
      op: "createPeriod",
      itemRef: "base",
      title: "Phase",
      startDate: "2026-09-20",
      endDate: "2026-09-21",
    },
  ]);
  fake.rows.push([{ id: "created" }], [{ id: "created" }]);
  expect(
    await applyCalendarDraft("coach", engagementId, "draft"),
  ).toMatchObject({ engagementId, applied: 3 });
  const itemId = fake.writes[0].value.id;
  expect(fake.writes[1]).toMatchObject({
    table: planCheckpoints,
    value: { itemId, status: "planned" },
  });
  expect(fake.writes[2]).toMatchObject({
    table: planPeriods,
    value: { itemId },
  });
  expect(fake.committed.at(-1)?.kind).toBe("delete");
  expect(fake.locks.slice(0, 2)).toEqual(["update", "update"]);
  expect(fake.emit).toHaveBeenCalledWith(
    "plan.published",
    expect.objectContaining({ planId: null }),
  );
});
it("applies updates and deletes at all three levels with scoped locking reads", async () => {
  review([
    { op: "updateItem", id, description: null },
    { op: "updateCheckpoint", id: childId, status: "done", note: null },
    { op: "updatePeriod", id: childId, startDate: "2026-09-21" },
    { op: "deleteCheckpoint", id: childId },
    { op: "deletePeriod", id: "44444444-4444-4444-8444-444444444444" },
    { op: "deleteItem", id },
  ]);
  fake.rows.push(
    [{ id }],
    [{ id: childId }],
    [{ id: childId, startDate: "2026-09-20", endDate: "2026-09-22" }],
    [{ id: childId }],
    [{ id }],
    [{ id }],
  );
  await applyCalendarDraft("coach", engagementId, "draft");
  expect(fake.writes.map((w) => w.kind)).toEqual([
    "update",
    "update",
    "update",
    "delete",
    "delete",
    "delete",
    "delete",
  ]);
  expect(fake.writes[0].value).toEqual({ description: null });
  expect(fake.writes[1].value).toEqual({ status: "done", note: null });
  expect(fake.writes[2].value).toEqual({ startDate: "2026-09-21" });
  for (let n = 2; n < 8; n++) expect(query(n).params).toContain(engagementId);
});
it.each([applyCalendarDraft, discardCalendarDraft])(
  "rejects missing or replaced draft before writes",
  async (action) => {
    review([create], "replacement");
    await expect(action("coach", engagementId, "old")).rejects.toBeInstanceOf(
      PlanDraftChangedError,
    );
    expect(fake.committed).toEqual([]);
    expect(fake.emit).not.toHaveBeenCalled();
  },
);
it.each([applyCalendarDraft, discardCalendarDraft])(
  "rejects foreign coaches and ended engagements using active scope",
  async (action) => {
    fake.rows.push([]);
    await expect(
      action("foreign", engagementId, "draft"),
    ).rejects.toBeInstanceOf(PlanAccessError);
    expect(query(0).params).toEqual([engagementId, "foreign", "active"]);
    expect(fake.writes).toEqual([]);
  },
);
it("rejects invalid stored contracts", async () => {
  review([{ op: "updateItem", id }]);
  await expect(
    applyCalendarDraft("coach", engagementId, "draft"),
  ).rejects.toBeInstanceOf(PlanDraftChangedError);
  expect(fake.writes).toEqual([]);
});
it("rolls back earlier writes when a child target has disappeared after parent deletion", async () => {
  review([
    { op: "deleteItem", id },
    { op: "updateCheckpoint", id: childId, title: "Gone" },
  ]);
  fake.rows.push([{ id }], []);
  await expect(
    applyCalendarDraft("coach", engagementId, "draft"),
  ).rejects.toBeInstanceOf(PlanDraftChangedError);
  expect(fake.writes[0].table).toBe(planItems);
  expect(fake.committed).toEqual([]);
  expect(fake.emit).not.toHaveBeenCalled();
});
it("rejects missing or foreign targets and invalid merged dates without publication", async () => {
  review([{ op: "updateItem", id, title: "X" }]);
  fake.rows.push([]);
  await expect(
    applyCalendarDraft("coach", engagementId, "draft"),
  ).rejects.toBeInstanceOf(PlanDraftChangedError);
  review([{ op: "updatePeriod", id, startDate: "2026-10-01" }]);
  fake.rows.push([{ id, startDate: "2026-09-20", endDate: "2026-09-30" }]);
  await expect(
    applyCalendarDraft("coach", engagementId, "draft"),
  ).rejects.toBeInstanceOf(PlanDraftChangedError);
  expect(fake.committed).toEqual([]);
  expect(fake.emit).not.toHaveBeenCalled();
});
it("discards even an obsolete malformed draft without changing live rows", async () => {
  review({ obsolete: true });
  await discardCalendarDraft("coach", engagementId, "draft");
  expect(fake.committed).toEqual([
    { table: planChangeDrafts, kind: "delete", value: {} },
  ]);
  expect(fake.emit).toHaveBeenCalledWith(
    "plan.draft",
    expect.objectContaining({ planId: null }),
  );
});
it("never lets coachees submit or read drafts", async () => {
  const actor = { userId: "client", role: "coachee" } as const;
  await expect(
    submitCalendarDraft(actor, { engagementId, operations: [create] }),
  ).rejects.toBeInstanceOf(PlanAccessError);
  await expect(readCalendarDraft(actor, engagementId)).rejects.toBeInstanceOf(
    PlanAccessError,
  );
  expect(fake.db.select).not.toHaveBeenCalled();
  expect(fake.db.transaction).not.toHaveBeenCalled();
});
it("distinguishes absent drafts from inaccessible engagements", async () => {
  await expect(readCalendarDraft(coach, engagementId)).rejects.toBeInstanceOf(
    PlanAccessError,
  );
  fake.rows.push([engagement], []);
  expect(await readCalendarDraft(coach, engagementId)).toBeNull();
});
it("resolves real and temporary titles but never foreign target titles", async () => {
  fake.rows.push(
    [engagement],
    [
      {
        id: "draft",
        submittedAt: new Date("2026-09-20Z"),
        operations: [
          create,
          {
            op: "createCheckpoint",
            itemRef: "base",
            title: "Check",
            date: "2026-09-20",
          },
          { op: "updateItem", id, title: "Renamed" },
          { op: "deleteCheckpoint", id: childId },
        ],
      },
    ],
    [{ id, title: "Existing" }],
    [],
    [],
  );
  const result = await readCalendarDraft(coach, engagementId);
  expect(result?.operations.map((o) => [o.title, o.itemTitle])).toEqual([
    ["Strength", null],
    ["Check", "Strength"],
    ["Existing", null],
    [null, null],
  ]);
  for (let n = 2; n < 5; n++) expect(query(n).params).toContain(engagementId);
});
it("returns obsolete drafts as discardable identities rather than breaking the client page", async () => {
  fake.rows.push(
    [engagement],
    [
      {
        id: "obsolete",
        submittedAt: new Date("2026-09-20Z"),
        operations: [{ op: "oldContract" }],
      },
    ],
  );
  expect(await readCalendarDraft(coach, engagementId)).toEqual({
    engagementId,
    draftId: "obsolete",
    submittedAt: "2026-09-20T00:00:00.000Z",
    operations: [],
    invalid: true,
  });
});
it("resolves current dates and parents to distinguish repeated target titles", async () => {
  fake.rows.push(
    [engagement],
    [
      {
        id: "draft",
        submittedAt: new Date("2026-09-20Z"),
        operations: [
          { op: "deleteCheckpoint", id },
          { op: "deleteCheckpoint", id: childId },
        ],
      },
    ],
    [],
    [
      { id, title: "Review", itemTitle: "Strength", date: "2026-09-20" },
      {
        id: childId,
        title: "Review",
        itemTitle: "Strength",
        date: "2026-09-27",
      },
    ],
    [],
  );
  const draft = await readCalendarDraft(coach, engagementId);
  expect(draft?.operations[0]).toMatchObject({
    title: "Review",
    itemTitle: "Strength",
    targetDate: "2026-09-20",
  });
  expect(draft?.operations[1]).toMatchObject({
    title: "Review",
    itemTitle: "Strength",
    targetDate: "2026-09-27",
  });
});
