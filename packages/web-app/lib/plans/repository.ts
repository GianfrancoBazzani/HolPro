import { randomUUID } from "node:crypto";
import {
  db,
  engagements,
  users,
  planDocuments,
  planDocumentDrafts,
  planDocumentVersions,
} from "@holpro/db";
import { and, eq, isNull, isNotNull, desc, or } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { readScope, publishScope } from "@/lib/mcp/scope";
import type { McpActor } from "@/lib/mcp/actor";
import { publishPlanSchema, type PublishPlanInput } from "@/lib/mcp/schemas";
import {
  PlanAccessError,
  PlanDraftChangedError,
  type PlanSummary,
  type PlanContent,
  type PlanEngagement,
} from "./types";
import { publishEvent } from "./events";
const visibleDocument = () =>
  and(
    isNull(planDocuments.deletedAt),
    isNotNull(planDocuments.currentVersionId),
  );
const coachVisibleDocument = () =>
  and(
    isNull(planDocuments.deletedAt),
    or(
      isNotNull(planDocuments.currentVersionId),
      isNotNull(planDocumentDrafts.id),
    ),
  );
const currentVersion = () =>
  and(
    eq(planDocumentVersions.id, planDocuments.currentVersionId),
    eq(planDocumentVersions.documentId, planDocuments.id),
  );
export async function canReadPlans(actor: McpActor, engagementId: string) {
  const [row] = await db
    .select({ id: engagements.id })
    .from(engagements)
    .where(and(eq(engagements.id, engagementId), readScope(actor)))
    .limit(1);
  return !!row;
}
export async function findPlanEngagementId(actor: McpActor, planId: string) {
  const [row] = await db
    .select({ engagementId: planDocuments.engagementId })
    .from(planDocuments)
    .innerJoin(engagements, eq(engagements.id, planDocuments.engagementId))
    .leftJoin(planDocumentVersions, currentVersion())
    .leftJoin(
      planDocumentDrafts,
      eq(planDocumentDrafts.documentId, planDocuments.id),
    )
    .where(
      and(
        eq(planDocuments.id, planId),
        readScope(actor),
        actor.role === "coach" ? coachVisibleDocument() : visibleDocument(),
      ),
    )
    .limit(1);
  return row?.engagementId;
}
export async function listPlanEngagements(
  actor: McpActor,
): Promise<PlanEngagement[]> {
  const coach = alias(users, "plan_coach"),
    coachee = alias(users, "plan_coachee");
  return db
    .select({
      id: engagements.id,
      coachName: coach.name,
      coacheeName: coachee.name,
      status: engagements.status,
    })
    .from(engagements)
    .innerJoin(coach, eq(coach.id, engagements.coachId))
    .innerJoin(coachee, eq(coachee.id, engagements.coacheeId))
    .where(readScope(actor))
    .orderBy(desc(engagements.startedAt), desc(engagements.id));
}
export async function listPlans(
  actor: McpActor,
  engagementId?: string,
): Promise<PlanSummary[]> {
  if (engagementId && !(await canReadPlans(actor, engagementId)))
    throw new PlanAccessError();
  const coach = actor.role === "coach";
  const timestamp = coach
    ? planDocuments.updatedAt
    : planDocumentVersions.createdAt;
  const rows = await db
    .select({
      planId: planDocuments.id,
      engagementId: planDocuments.engagementId,
      title: planDocuments.title,
      versionNumber: planDocumentVersions.number,
      updatedAt: timestamp,
      draftSubmittedAt: planDocumentDrafts.submittedAt,
    })
    .from(planDocuments)
    .innerJoin(engagements, eq(engagements.id, planDocuments.engagementId))
    .leftJoin(planDocumentVersions, currentVersion())
    .leftJoin(
      planDocumentDrafts,
      eq(planDocumentDrafts.documentId, planDocuments.id),
    )
    .where(
      and(
        readScope(actor),
        coach ? coachVisibleDocument() : visibleDocument(),
        engagementId ? eq(engagements.id, engagementId) : undefined,
      ),
    )
    .orderBy(desc(timestamp), desc(planDocuments.id))
    .limit(200);
  return rows.map(({ draftSubmittedAt, ...row }) => ({
    ...row,
    versionNumber: row.versionNumber ?? 0,
    updatedAt: row.updatedAt!.toISOString(),
    ...(coach
      ? { draftSubmittedAt: draftSubmittedAt?.toISOString() ?? null }
      : {}),
  }));
}
export async function readPlanDraft(actor: McpActor, planId: string) {
  if (actor.role !== "coach") throw new PlanAccessError();
  const [row] = await db
    .select({
      draftId: planDocumentDrafts.id,
      title: planDocumentDrafts.title,
      documentTitle: planDocuments.title,
      html: planDocumentDrafts.html,
      submittedAt: planDocumentDrafts.submittedAt,
    })
    .from(planDocuments)
    .innerJoin(engagements, eq(engagements.id, planDocuments.engagementId))
    .innerJoin(
      planDocumentDrafts,
      eq(planDocumentDrafts.documentId, planDocuments.id),
    )
    .where(
      and(
        eq(planDocuments.id, planId),
        isNull(planDocuments.deletedAt),
        readScope(actor),
      ),
    )
    .limit(1);
  if (!row) throw new PlanAccessError();
  return {
    planId,
    draftId: row.draftId,
    title: row.title ?? row.documentTitle,
    html: row.html,
    submittedAt: row.submittedAt.toISOString(),
  };
}
export async function readPlan(
  actor: McpActor,
  planId: string,
  version?: number,
): Promise<PlanContent> {
  const [row] = await db
    .select({
      title: planDocuments.title,
      versionNumber: planDocumentVersions.number,
      html: planDocumentVersions.html,
      createdAt: planDocumentVersions.createdAt,
    })
    .from(planDocuments)
    .innerJoin(engagements, eq(engagements.id, planDocuments.engagementId))
    .innerJoin(
      planDocumentVersions,
      version === undefined
        ? currentVersion()
        : and(
            eq(planDocumentVersions.documentId, planDocuments.id),
            eq(planDocumentVersions.number, version),
          ),
    )
    .where(
      and(eq(planDocuments.id, planId), readScope(actor), visibleDocument()),
    )
    .limit(1);
  if (!row) throw new PlanAccessError();
  return {
    planId,
    title: row.title,
    versionNumber: row.versionNumber,
    html: row.html,
    publishedAt: row.createdAt.toISOString(),
  };
}
export async function hasPublishedPlan(userId: string) {
  const [row] = await db
    .select({ id: planDocuments.id })
    .from(planDocuments)
    .innerJoin(engagements, eq(engagements.id, planDocuments.engagementId))
    .innerJoin(planDocumentVersions, currentVersion())
    .where(and(readScope({ userId, role: "coachee" }), visibleDocument()))
    .limit(1);
  return !!row;
}
export async function submitPlanDraft(
  actor: McpActor,
  input: PublishPlanInput,
) {
  const parsed = publishPlanSchema.parse(input);
  if (actor.role !== "coach") throw new PlanAccessError();
  const committed = await db.transaction(async (tx) => {
    const [engagement] = await tx
      .select({
        id: engagements.id,
        coachId: engagements.coachId,
        coacheeId: engagements.coacheeId,
      })
      .from(engagements)
      .where(and(eq(engagements.id, parsed.engagementId), publishScope(actor)))
      .for("update");
    if (!engagement) throw new PlanAccessError();
    const planId = parsed.planId ?? randomUUID();
    if (parsed.planId) {
      const [document] = await tx
        .select({ id: planDocuments.id })
        .from(planDocuments)
        .where(
          and(
            eq(planDocuments.id, planId),
            eq(planDocuments.engagementId, engagement.id),
            isNull(planDocuments.deletedAt),
          ),
        )
        .for("update");
      if (!document) throw new PlanAccessError();
    } else
      await tx.insert(planDocuments).values({
        id: planId,
        engagementId: engagement.id,
        title: parsed.title!,
        createdBy: actor.userId,
        currentVersionId: null,
      });
    const submittedAt = new Date();
    const values = {
      id: randomUUID(),
      documentId: planId,
      title: parsed.title ?? null,
      html: parsed.html,
      submittedBy: actor.userId,
      submittedAt,
      updatedAt: submittedAt,
    };
    await tx
      .insert(planDocumentDrafts)
      .values(values)
      .onDuplicateKeyUpdate({ set: values });
    await tx
      .update(planDocuments)
      .set({ updatedAt: submittedAt })
      .where(eq(planDocuments.id, planId));
    return {
      result: {
        planId,
        status: "pending_review" as const,
        submittedAt: submittedAt.toISOString(),
      },
      event: {
        planId,
        engagementId: engagement.id,
        coachId: engagement.coachId,
        coacheeId: engagement.coacheeId,
      },
    };
  });
  publishEvent("plan.draft", committed.event);
  return committed.result;
}

// All mutations serialize on engagement first, then document, then draft.
async function reviewDraft(
  coachId: string,
  planId: string,
  draftId: string,
  approve: boolean,
) {
  const committed = await db.transaction(async (tx) => {
    const [scope] = await tx
      .select({ engagementId: planDocuments.engagementId })
      .from(planDocuments)
      .where(eq(planDocuments.id, planId))
      .limit(1);
    if (!scope) throw new PlanAccessError();
    const [engagement] = await tx
      .select({
        id: engagements.id,
        coachId: engagements.coachId,
        coacheeId: engagements.coacheeId,
      })
      .from(engagements)
      .where(
        and(
          eq(engagements.id, scope.engagementId),
          eq(engagements.coachId, coachId),
        ),
      )
      .for("update");
    if (!engagement) throw new PlanAccessError();
    const [document] = await tx
      .select({
        id: planDocuments.id,
        currentVersionId: planDocuments.currentVersionId,
      })
      .from(planDocuments)
      .where(
        and(
          eq(planDocuments.id, planId),
          eq(planDocuments.engagementId, engagement.id),
          isNull(planDocuments.deletedAt),
        ),
      )
      .for("update");
    if (!document) throw new PlanDraftChangedError();
    const [draft] = await tx
      .select()
      .from(planDocumentDrafts)
      .where(eq(planDocumentDrafts.documentId, planId))
      .for("update");
    if (!draft || draft.id !== draftId) throw new PlanDraftChangedError();
    const now = new Date();
    let publication: { versionNumber: number; publishedAt: string } | undefined;
    if (approve) {
      const [latest] = await tx
        .select({ value: planDocumentVersions.number })
        .from(planDocumentVersions)
        .where(eq(planDocumentVersions.documentId, planId))
        .orderBy(desc(planDocumentVersions.number))
        .limit(1)
        .for("update");
      const versionNumber = (latest?.value ?? 0) + 1,
        versionId = randomUUID();
      await tx
        .insert(planDocumentVersions)
        .values({
          id: versionId,
          documentId: planId,
          number: versionNumber,
          html: draft.html,
          publishedBy: coachId,
          createdAt: now,
        });
      await tx
        .update(planDocuments)
        .set({
          currentVersionId: versionId,
          updatedAt: now,
          ...(draft.title === null ? {} : { title: draft.title }),
        })
        .where(eq(planDocuments.id, planId));
      publication = { versionNumber, publishedAt: now.toISOString() };
    } else {
      await tx
        .update(planDocuments)
        .set({
          updatedAt: now,
          ...(document.currentVersionId === null ? { deletedAt: now } : {}),
        })
        .where(eq(planDocuments.id, planId));
    }
    await tx
      .delete(planDocumentDrafts)
      .where(eq(planDocumentDrafts.id, draftId));
    return {
      publication,
      event: {
        planId,
        engagementId: engagement.id,
        coachId,
        coacheeId: engagement.coacheeId,
      },
    };
  });
  publishEvent(approve ? "plan.published" : "plan.draft", committed.event);
  return committed.publication;
}
export async function approvePlanDraft(
  coachId: string,
  planId: string,
  draftId: string,
) {
  const publication = await reviewDraft(coachId, planId, draftId, true);
  return { planId, ...publication! };
}
export async function discardPlanDraft(
  coachId: string,
  planId: string,
  draftId: string,
) {
  await reviewDraft(coachId, planId, draftId, false);
  return { planId };
}
