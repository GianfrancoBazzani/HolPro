import { randomUUID } from "node:crypto";
import {
  db,
  engagements,
  users,
  planDocuments,
  planDocumentVersions,
} from "@holpro/db";
import { and, eq, isNull, isNotNull, desc, max } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { readScope, publishScope } from "@/lib/mcp/scope";
import type { McpActor } from "@/lib/mcp/actor";
import { publishPlanSchema, type PublishPlanInput } from "@/lib/mcp/schemas";
import {
  PlanAccessError,
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
    .innerJoin(planDocumentVersions, currentVersion())
    .where(and(eq(planDocuments.id, planId), readScope(actor), visibleDocument()))
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
  const rows = await db
    .select({
      planId: planDocuments.id,
      engagementId: planDocuments.engagementId,
      title: planDocuments.title,
      versionNumber: planDocumentVersions.number,
      updatedAt: planDocuments.updatedAt,
    })
    .from(planDocuments)
    .innerJoin(engagements, eq(engagements.id, planDocuments.engagementId))
    .innerJoin(planDocumentVersions, currentVersion())
    .where(
      and(
        readScope(actor),
        visibleDocument(),
        engagementId ? eq(engagements.id, engagementId) : undefined,
      ),
    )
    .orderBy(desc(planDocuments.updatedAt), desc(planDocuments.id))
    .limit(200);
  return rows.map((row) => ({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  }));
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
export async function publishPlan(actor: McpActor, input: PublishPlanInput) {
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
            visibleDocument(),
          ),
        )
        .for("update");
      if (!document) throw new PlanAccessError();
    } else
      await tx
        .insert(planDocuments)
        .values({
          id: planId,
          engagementId: engagement.id,
          title: parsed.title!,
          createdBy: actor.userId,
        });
    const [latest] = await tx
      .select({ value: max(planDocumentVersions.number) })
      .from(planDocumentVersions)
      .where(eq(planDocumentVersions.documentId, planId));
    const versionNumber = (latest?.value ?? 0) + 1,
      versionId = randomUUID();
    await tx
      .insert(planDocumentVersions)
      .values({
        id: versionId,
        documentId: planId,
        number: versionNumber,
        html: parsed.html,
        publishedBy: actor.userId,
      });
    await tx
      .update(planDocuments)
      .set({
        currentVersionId: versionId,
        ...(parsed.title === undefined ? {} : { title: parsed.title }),
      })
      .where(eq(planDocuments.id, planId));
    const [version] = await tx
      .select({ createdAt: planDocumentVersions.createdAt })
      .from(planDocumentVersions)
      .where(eq(planDocumentVersions.id, versionId));
    if (!version) throw new Error("Publication failed.");
    return {
      result: {
        planId,
        versionNumber,
        publishedAt: version.createdAt.toISOString(),
      },
      event: {
        planId,
        engagementId: engagement.id,
        coachId: engagement.coachId,
        coacheeId: engagement.coacheeId,
      },
    };
  });
  publishEvent(committed.event);
  return committed.result;
}
