import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
const url = process.env.CALENDAR_TEST_DATABASE_URL;
describe.skipIf(!url)("calendar drafts against isolated MySQL", () => {
  let connection: Awaited<ReturnType<typeof createConnection>>;
  let repository: typeof import("../lib/calendar/draft-repository");
  const users: string[] = [],
    engagements: string[] = [];
  let coachId: string, clientId: string, engagementId: string;
  beforeAll(async () => {
    if (!url || new URL(url).pathname !== "/holpro_calendar_test")
      throw Error("Use a dedicated holpro_calendar_test database");
    process.env.DATABASE_URL = url;
    connection = await createConnection(url);
    await migrate(drizzle(connection), {
      migrationsFolder: resolve("../db/drizzle"),
    });
    repository = await import("../lib/calendar/draft-repository");
  }, 60000);
  beforeEach(async () => {
    coachId = randomUUID();
    clientId = randomUUID();
    engagementId = randomUUID();
    users.push(coachId, clientId);
    engagements.push(engagementId);
    for (const id of [coachId, clientId])
      await connection.execute(
        "INSERT INTO users (id,full_name,email,status) VALUES (?,? ,?,'active')",
        [id, "Calendar test", `${id}@example.test`],
      );
    await connection.execute("INSERT INTO coaches (user_id) VALUES (?)", [
      coachId,
    ]);
    await connection.execute("INSERT INTO coachees (user_id) VALUES (?)", [
      clientId,
    ]);
    await connection.execute(
      "INSERT INTO engagements (id,coach_id,coachee_id) VALUES (?,?,?)",
      [engagementId, coachId, clientId],
    );
  });
  afterAll(async () => {
    if (!connection) return;
    for (const id of engagements)
      await connection.execute("DELETE FROM engagements WHERE id=?", [id]);
    for (const id of users)
      await connection.execute("DELETE FROM users WHERE id=?", [id]);
    await connection.end();
  });
  const actor = () => ({ userId: coachId, role: "coach" as const });
  async function rows(
    table:
      | "plan_items"
      | "plan_checkpoints"
      | "plan_periods"
      | "plan_change_drafts",
  ) {
    const [result] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM ${table}`,
    );
    return result;
  }
  async function seed() {
    const draft = await repository.submitCalendarDraft(actor(), {
      engagementId,
      operations: [
        {
          op: "createItem",
          tempId: "item",
          kind: "training",
          title: "Strength",
          description: "Original description",
        },
        {
          op: "createCheckpoint",
          itemRef: "item",
          title: "Review",
          date: "2026-09-21",
          note: "Original note",
        },
        {
          op: "createPeriod",
          itemRef: "item",
          title: "Base",
          startDate: "2026-09-21",
          endDate: "2026-09-30",
          note: "Period note",
        },
      ],
    });
    await repository.applyCalendarDraft(coachId, engagementId, draft.draftId);
    const item = (await rows("plan_items")).find(
      (row) => row.engagement_id === engagementId,
    )!;
    return {
      item,
      checkpoint: (await rows("plan_checkpoints")).find(
        (row) => row.item_id === item.id,
      )!,
      period: (await rows("plan_periods")).find(
        (row) => row.item_id === item.id,
      )!,
    };
  }
  it("keeps proposals private, replaces identities, and applies every create atomically", async () => {
    const first = await repository.submitCalendarDraft(actor(), {
      engagementId,
      operations: [
        { op: "createItem", tempId: "first", kind: "training", title: "First" },
      ],
    });
    const second = await repository.submitCalendarDraft(actor(), {
      engagementId,
      operations: [
        {
          op: "createItem",
          tempId: "second",
          kind: "training",
          title: "Second",
        },
      ],
    });
    expect(
      (await rows("plan_items")).filter(
        (row) => row.engagement_id === engagementId,
      ),
    ).toEqual([]);
    expect(
      (await rows("plan_change_drafts")).filter(
        (row) => row.engagement_id === engagementId,
      ),
    ).toHaveLength(1);
    await expect(
      repository.applyCalendarDraft(coachId, engagementId, first.draftId),
    ).rejects.toThrow();
    await repository.discardCalendarDraft(
      coachId,
      engagementId,
      second.draftId,
    );
    const { item, checkpoint, period } = await seed();
    expect(checkpoint.item_id).toBe(item.id);
    expect(period.item_id).toBe(item.id);
    expect(
      await repository.readCalendarDraft(actor(), engagementId),
    ).toBeNull();
  });
  it("merges partial updates, preserves omitted text, clears explicit nulls, and deletes children", async () => {
    const { item, checkpoint, period } = await seed();
    const draft = await repository.submitCalendarDraft(actor(), {
      engagementId,
      operations: [
        { op: "updateItem", id: item.id, title: "Updated" },
        {
          op: "updateCheckpoint",
          id: checkpoint.id,
          status: "done",
          note: null,
        },
        { op: "updatePeriod", id: period.id, startDate: "2026-09-22" },
      ],
    });
    expect(
      (
        await repository.applyCalendarDraft(
          coachId,
          engagementId,
          draft.draftId,
        )
      ).applied,
    ).toBe(3);
    expect(
      (await rows("plan_items")).find((row) => row.id === item.id),
    ).toMatchObject({ title: "Updated", description: "Original description" });
    expect(
      (await rows("plan_checkpoints")).find((row) => row.id === checkpoint.id),
    ).toMatchObject({ status: "done", note: null });
    expect(
      (await rows("plan_periods")).find((row) => row.id === period.id)?.note,
    ).toBe("Period note");
    const removal = await repository.submitCalendarDraft(actor(), {
      engagementId,
      operations: [
        { op: "deleteCheckpoint", id: checkpoint.id },
        { op: "deletePeriod", id: period.id },
        { op: "deleteItem", id: item.id },
      ],
    });
    await repository.applyCalendarDraft(coachId, engagementId, removal.draftId);
    expect(
      (await rows("plan_items")).find((row) => row.id === item.id),
    ).toBeUndefined();
  });
  it("rolls back cascades and earlier writes when a later target disappears", async () => {
    const { item, checkpoint } = await seed();
    const draft = await repository.submitCalendarDraft(actor(), {
      engagementId,
      operations: [
        { op: "deleteItem", id: item.id },
        {
          op: "updateCheckpoint",
          id: checkpoint.id,
          title: "Missing after cascade",
        },
      ],
    });
    await expect(
      repository.applyCalendarDraft(coachId, engagementId, draft.draftId),
    ).rejects.toThrow();
    expect(
      (await rows("plan_items")).find((row) => row.id === item.id),
    ).toBeDefined();
    expect(
      (await rows("plan_checkpoints")).find((row) => row.id === checkpoint.id),
    ).toBeDefined();
    expect(
      (await repository.readCalendarDraft(actor(), engagementId))?.draftId,
    ).toBe(draft.draftId);
  });
  it("rejects foreign coaches, ended engagements and inverted merged dates", async () => {
    const { item, period } = await seed();
    const draft = await repository.submitCalendarDraft(actor(), {
      engagementId,
      operations: [
        { op: "updateItem", id: item.id, title: "Must roll back" },
        { op: "updatePeriod", id: period.id, startDate: "2026-10-01" },
      ],
    });
    await expect(
      repository.applyCalendarDraft(randomUUID(), engagementId, draft.draftId),
    ).rejects.toThrow();
    await expect(
      repository.applyCalendarDraft(coachId, engagementId, draft.draftId),
    ).rejects.toThrow();
    expect(
      (await rows("plan_items")).find((row) => row.id === item.id)?.title,
    ).toBe("Strength");
    await connection.execute(
      "UPDATE engagements SET status='ended' WHERE id=?",
      [engagementId],
    );
    await expect(
      repository.discardCalendarDraft(coachId, engagementId, draft.draftId),
    ).rejects.toThrow();
  });
});
