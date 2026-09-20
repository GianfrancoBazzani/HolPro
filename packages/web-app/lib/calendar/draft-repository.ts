import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  db,
  engagements,
  planChangeDrafts,
  planItems,
  planCheckpoints,
  planPeriods,
} from "@holpro/db";
import type { McpActor } from "@/lib/mcp/actor";
import { publishScope, readScope } from "@/lib/mcp/scope";
import {
  calendarOperationsSchema,
  proposeCalendarChangesSchema,
  type ProposeCalendarChangesInput,
  type CalendarDraft,
  type CalendarOperation,
} from "@/lib/mcp/schemas";
import { PlanAccessError, PlanDraftChangedError } from "@/lib/plans/types";
import { publishEvent } from "@/lib/plans/events";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function lockEngagement(
  tx: Transaction,
  coachId: string,
  engagementId: string,
) {
  const [engagement] = await tx
    .select({
      id: engagements.id,
      coachId: engagements.coachId,
      coacheeId: engagements.coacheeId,
    })
    .from(engagements)
    .where(
      and(
        eq(engagements.id, engagementId),
        publishScope({ userId: coachId, role: "coach" }),
      ),
    )
    .for("update");
  if (!engagement) throw new PlanAccessError();
  return engagement;
}
const eventFor = (engagement: Awaited<ReturnType<typeof lockEngagement>>) => ({
  planId: null,
  engagementId: engagement.id,
  coachId: engagement.coachId,
  coacheeId: engagement.coacheeId,
});
export async function submitCalendarDraft(
  actor: McpActor,
  input: ProposeCalendarChangesInput,
) {
  if (actor.role !== "coach") throw new PlanAccessError();
  const parsed = proposeCalendarChangesSchema.parse(input);
  const committed = await db.transaction(async (tx) => {
    const engagement = await lockEngagement(
      tx,
      actor.userId,
      parsed.engagementId,
    );
    const submittedAt = new Date();
    const values = {
      id: randomUUID(),
      engagementId: engagement.id,
      operations: parsed.operations,
      submittedBy: actor.userId,
      submittedAt,
      updatedAt: submittedAt,
    };
    await tx
      .insert(planChangeDrafts)
      .values(values)
      .onDuplicateKeyUpdate({ set: values });
    return {
      event: eventFor(engagement),
      result: {
        engagementId: engagement.id,
        draftId: values.id,
        status: "pending_review" as const,
        submittedAt: submittedAt.toISOString(),
        operationCount: parsed.operations.length,
      },
    };
  });
  publishEvent("plan.draft", committed.event);
  return committed.result;
}
export async function readCalendarDraft(
  actor: McpActor,
  engagementId: string,
): Promise<CalendarDraft | null> {
  if (actor.role !== "coach") throw new PlanAccessError();
  const [engagement] = await db
    .select({ id: engagements.id })
    .from(engagements)
    .where(and(eq(engagements.id, engagementId), readScope(actor)))
    .limit(1);
  if (!engagement) throw new PlanAccessError();
  const [draft] = await db
    .select()
    .from(planChangeDrafts)
    .where(eq(planChangeDrafts.engagementId, engagementId))
    .limit(1);
  if (!draft) return null;
  const parsed = calendarOperationsSchema.safeParse(draft.operations);
  if (!parsed.success)
    return {
      engagementId,
      draftId: draft.id,
      submittedAt: draft.submittedAt.toISOString(),
      operations: [],
      invalid: true,
    };
  const [items, checkpoints, periods] = await Promise.all([
    db
      .select({ id: planItems.id, title: planItems.title })
      .from(planItems)
      .where(eq(planItems.engagementId, engagementId)),
    db
      .select({
        id: planCheckpoints.id,
        title: planCheckpoints.title,
        date: planCheckpoints.date,
        itemTitle: planItems.title,
      })
      .from(planCheckpoints)
      .innerJoin(planItems, eq(planCheckpoints.itemId, planItems.id))
      .where(eq(planItems.engagementId, engagementId)),
    db
      .select({
        id: planPeriods.id,
        title: planPeriods.title,
        startDate: planPeriods.startDate,
        endDate: planPeriods.endDate,
        itemTitle: planItems.title,
      })
      .from(planPeriods)
      .innerJoin(planItems, eq(planPeriods.itemId, planItems.id))
      .where(eq(planItems.engagementId, engagementId)),
  ]);
  const itemTitles = new Map(items.map((row) => [row.id, row.title]));
  const checkpointTitles = new Map(checkpoints.map((row) => [row.id, row]));
  const periodTitles = new Map(periods.map((row) => [row.id, row]));
  const operations = parsed.data.map((operation) => {
    if (operation.op === "createItem") {
      itemTitles.set(operation.tempId, operation.title);
      return { operation, title: operation.title, itemTitle: null };
    }
    if ("itemRef" in operation)
      return {
        operation,
        title: operation.title,
        itemTitle: itemTitles.get(operation.itemRef) ?? null,
      };
    if (operation.op === "updateItem" || operation.op === "deleteItem")
      return {
        operation,
        title: itemTitles.get(operation.id) ?? null,
        itemTitle: null,
      };
    const row = (
      operation.op === "updateCheckpoint" || operation.op === "deleteCheckpoint"
        ? checkpointTitles
        : periodTitles
    ).get(operation.id);
    return {
      operation,
      title: row?.title ?? null,
      itemTitle: row?.itemTitle ?? null,
      ...(row && "date" in row ? { targetDate: row.date } : {}),
      ...(row && "startDate" in row
        ? { targetStartDate: row.startDate, targetEndDate: row.endDate }
        : {}),
    };
  });
  return {
    engagementId,
    draftId: draft.id,
    submittedAt: draft.submittedAt.toISOString(),
    operations,
  };
}
async function requireItem(tx: Transaction, engagementId: string, id: string) {
  const [row] = await tx
    .select()
    .from(planItems)
    .where(and(eq(planItems.id, id), eq(planItems.engagementId, engagementId)))
    .for("update");
  if (!row) throw new PlanDraftChangedError();
  return row;
}
async function requireCheckpoint(
  tx: Transaction,
  engagementId: string,
  id: string,
) {
  const [row] = await tx
    .select({ id: planCheckpoints.id })
    .from(planCheckpoints)
    .innerJoin(planItems, eq(planCheckpoints.itemId, planItems.id))
    .where(
      and(eq(planCheckpoints.id, id), eq(planItems.engagementId, engagementId)),
    )
    .for("update");
  if (!row) throw new PlanDraftChangedError();
  return row;
}
async function requirePeriod(
  tx: Transaction,
  engagementId: string,
  id: string,
) {
  const [row] = await tx
    .select({
      id: planPeriods.id,
      startDate: planPeriods.startDate,
      endDate: planPeriods.endDate,
    })
    .from(planPeriods)
    .innerJoin(planItems, eq(planPeriods.itemId, planItems.id))
    .where(
      and(eq(planPeriods.id, id), eq(planItems.engagementId, engagementId)),
    )
    .for("update");
  if (!row) throw new PlanDraftChangedError();
  return row;
}
async function applyOperation(
  tx: Transaction,
  engagementId: string,
  operation: CalendarOperation,
  tempIds: Map<string, string>,
) {
  switch (operation.op) {
    case "createItem": {
      const id = randomUUID();
      await tx.insert(planItems).values({
        id,
        engagementId,
        kind: operation.kind,
        title: operation.title,
        description: operation.description ?? null,
      });
      tempIds.set(operation.tempId, id);
      break;
    }
    case "updateItem": {
      await requireItem(tx, engagementId, operation.id);
      await tx
        .update(planItems)
        .set({
          kind: operation.kind,
          title: operation.title,
          description: operation.description,
        })
        .where(eq(planItems.id, operation.id));
      break;
    }
    case "deleteItem":
      await requireItem(tx, engagementId, operation.id);
      await tx.delete(planItems).where(eq(planItems.id, operation.id));
      break;
    case "createCheckpoint": {
      const itemId = tempIds.get(operation.itemRef) ?? operation.itemRef;
      await requireItem(tx, engagementId, itemId);
      await tx.insert(planCheckpoints).values({
        id: randomUUID(),
        itemId,
        date: operation.date,
        title: operation.title,
        status: operation.status ?? "planned",
        note: operation.note ?? null,
      });
      break;
    }
    case "updateCheckpoint": {
      await requireCheckpoint(tx, engagementId, operation.id);
      await tx
        .update(planCheckpoints)
        .set({
          date: operation.date,
          title: operation.title,
          status: operation.status,
          note: operation.note,
        })
        .where(eq(planCheckpoints.id, operation.id));
      break;
    }
    case "deleteCheckpoint":
      await requireCheckpoint(tx, engagementId, operation.id);
      await tx
        .delete(planCheckpoints)
        .where(eq(planCheckpoints.id, operation.id));
      break;
    case "createPeriod": {
      const itemId = tempIds.get(operation.itemRef) ?? operation.itemRef;
      await requireItem(tx, engagementId, itemId);
      await tx.insert(planPeriods).values({
        id: randomUUID(),
        itemId,
        startDate: operation.startDate,
        endDate: operation.endDate,
        title: operation.title,
        note: operation.note ?? null,
      });
      break;
    }
    case "updatePeriod": {
      const row = await requirePeriod(tx, engagementId, operation.id);
      if (
        (operation.endDate ?? row.endDate) <
        (operation.startDate ?? row.startDate)
      )
        throw new PlanDraftChangedError();
      await tx
        .update(planPeriods)
        .set({
          startDate: operation.startDate,
          endDate: operation.endDate,
          title: operation.title,
          note: operation.note,
        })
        .where(eq(planPeriods.id, operation.id));
      break;
    }
    case "deletePeriod":
      await requirePeriod(tx, engagementId, operation.id);
      await tx.delete(planPeriods).where(eq(planPeriods.id, operation.id));
  }
}
// Lock engagement first, draft second. Resolve each target only at its turn so
// cascades and edits earlier in the changeset are observed by later operations.
async function reviewCalendarDraft(
  coachId: string,
  engagementId: string,
  draftId: string,
  approve: boolean,
) {
  const committed = await db.transaction(async (tx) => {
    const engagement = await lockEngagement(tx, coachId, engagementId);
    const [draft] = await tx
      .select()
      .from(planChangeDrafts)
      .where(eq(planChangeDrafts.engagementId, engagementId))
      .for("update");
    if (!draft || draft.id !== draftId) throw new PlanDraftChangedError();
    let applied = 0;
    if (approve) {
      const parsed = calendarOperationsSchema.safeParse(draft.operations);
      if (!parsed.success) throw new PlanDraftChangedError();
      const tempIds = new Map<string, string>();
      for (const operation of parsed.data)
        await applyOperation(tx, engagementId, operation, tempIds);
      applied = parsed.data.length;
    }
    await tx.delete(planChangeDrafts).where(eq(planChangeDrafts.id, draftId));
    return {
      event: eventFor(engagement),
      result: { engagementId, applied, appliedAt: new Date().toISOString() },
    };
  });
  publishEvent(approve ? "plan.published" : "plan.draft", committed.event);
  return committed.result;
}
export async function applyCalendarDraft(
  coachId: string,
  engagementId: string,
  draftId: string,
) {
  return reviewCalendarDraft(coachId, engagementId, draftId, true);
}
export async function discardCalendarDraft(
  coachId: string,
  engagementId: string,
  draftId: string,
) {
  await reviewCalendarDraft(coachId, engagementId, draftId, false);
  return { engagementId };
}
