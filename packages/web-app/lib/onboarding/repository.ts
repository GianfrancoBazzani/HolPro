import { randomUUID } from "node:crypto";
import {
  db,
  users,
  coachees,
  coaches,
  coacheeGoals,
  engagements,
  onboardingRequests,
  planDocuments,
  planDocumentDrafts,
  notifications,
} from "@holpro/db";
import { and, eq, lte, or, asc, desc } from "drizzle-orm";
import { z } from "zod";
import { alias } from "drizzle-orm/mysql-core";
import type { McpActor } from "@/lib/mcp/actor";
import {
  coachDraftReviewHref,
  clientPlanHref,
  clientHomeHref,
} from "@/lib/notifications/links";
import { activeUser } from "@/lib/auth/queries";
export type OnboardingJob = typeof onboardingRequests.$inferSelect;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function requestOnboarding(actor: McpActor, coachId: string) {
  if (actor.role !== "coachee") throw new Error("forbidden");
  z.uuid().parse(coachId);
  if (coachId === actor.userId) throw new Error("coach_unavailable");
  return db.transaction(async (tx) => {
    // Serialize all requests from this coachee, including simultaneous confirmations.
    const [user] = await tx
      .select({ id: coachees.userId })
      .from(coachees)
      .innerJoin(users, eq(users.id, coachees.userId))
      .where(activeUser(actor.userId))
      .for("update");
    if (!user) throw new Error("forbidden");
    const [existing] = await tx
      .select()
      .from(onboardingRequests)
      .where(
        and(
          eq(onboardingRequests.coacheeId, actor.userId),
          eq(onboardingRequests.coachId, coachId),
        ),
      )
      .for("update");
    if (existing) return existing;
    const [coach] = await tx
      .select({ id: coaches.userId })
      .from(coaches)
      .innerJoin(users, eq(users.id, coaches.userId))
      .where(and(activeUser(coachId), eq(coaches.acceptingClients, true)));
    if (!coach) throw new Error("coach_unavailable");
    const [goals] = await tx
      .select()
      .from(coacheeGoals)
      .where(eq(coacheeGoals.coacheeId, actor.userId));
    if (!goals?.goals.trim()) throw new Error("goals_required");
    const [existingEngagement] = await tx
      .select()
      .from(engagements)
      .where(
        and(
          eq(engagements.coachId, coachId),
          eq(engagements.coacheeId, actor.userId),
          eq(engagements.status, "active"),
        ),
      )
      .for("update");
    const engagementId = existingEngagement?.id ?? randomUUID();
    if (!existingEngagement)
      await tx
        .insert(engagements)
        .values({ id: engagementId, coachId, coacheeId: actor.userId });
    const row = {
      id: randomUUID(),
      coachId,
      coacheeId: actor.userId,
      engagementId,
      goals: goals.goals,
      status: "requested" as const,
    };
    await tx.insert(onboardingRequests).values(row);
    return row;
  });
}
export async function listOnboarding(actor: McpActor) {
  const client = alias(users, "onboarding_client");
  return db
    .select({
      id: onboardingRequests.id,
      coachId: onboardingRequests.coachId,
      engagementId: onboardingRequests.engagementId,
      status: onboardingRequests.status,
      errorCode: onboardingRequests.errorCode,
      coachName: users.name,
      clientName: client.name,
    })
    .from(onboardingRequests)
    .innerJoin(users, eq(users.id, onboardingRequests.coachId))
    .innerJoin(client, eq(client.id, onboardingRequests.coacheeId))
    .where(
      actor.role === "coach"
        ? eq(onboardingRequests.coachId, actor.userId)
        : eq(onboardingRequests.coacheeId, actor.userId),
    )
    .orderBy(desc(onboardingRequests.createdAt))
    .limit(50);
}
export async function retryOnboarding(actor: McpActor, id: string) {
  z.uuid().parse(id);
  await db
    .update(onboardingRequests)
    .set({
      status: "requested",
      attempts: 0,
      nextAttemptAt: new Date(),
      errorCode: null,
      leaseToken: null,
      leaseUntil: null,
    })
    .where(
      and(
        eq(onboardingRequests.id, id),
        eq(onboardingRequests.status, "failed"),
        actor.role === "coach"
          ? eq(onboardingRequests.coachId, actor.userId)
          : eq(onboardingRequests.coacheeId, actor.userId),
      ),
    );
}
export async function claimOnboarding() {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [row] = await tx
      .select()
      .from(onboardingRequests)
      .where(
        or(
          and(
            eq(onboardingRequests.status, "requested"),
            lte(onboardingRequests.nextAttemptAt, now),
          ),
          and(
            eq(onboardingRequests.status, "preparing"),
            lte(onboardingRequests.leaseUntil, now),
          ),
        ),
      )
      .orderBy(asc(onboardingRequests.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!row) return null;
    if (row.attempts >= 3) {
      await tx
        .update(onboardingRequests)
        .set({
          status: "failed",
          errorCode: "preparation_failed",
          leaseToken: null,
          leaseUntil: null,
        })
        .where(eq(onboardingRequests.id, row.id));
      return null;
    }
    const lease = {
      status: "preparing" as const,
      attempts: row.attempts + 1,
      leaseToken: randomUUID(),
      leaseUntil: new Date(now.getTime() + 5 * 60_000),
    };
    await tx
      .update(onboardingRequests)
      .set(lease)
      .where(eq(onboardingRequests.id, row.id));
    return { ...row, ...lease };
  });
}
export const draftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  html: z.string().trim().min(1).max(200_000),
});
export async function completeOnboarding(
  job: Pick<OnboardingJob, "id" | "engagementId" | "leaseToken">,
  draft: z.infer<typeof draftSchema>,
) {
  const parsed = draftSchema.parse(draft);
  return db.transaction(async (tx) => {
    // Same lock order as review: engagement, then request/document.
    const [engagement] = await tx
      .select()
      .from(engagements)
      .where(
        and(
          eq(engagements.id, job.engagementId),
          eq(engagements.status, "active"),
        ),
      )
      .for("update");
    if (!engagement) throw new Error("engagement_unavailable");
    const [row] = await tx
      .select()
      .from(onboardingRequests)
      .where(
        and(
          eq(onboardingRequests.id, job.id),
          eq(onboardingRequests.status, "preparing"),
          eq(onboardingRequests.leaseToken, job.leaseToken!),
        ),
      )
      .for("update");
    if (!row) return false;
    const planId = randomUUID(),
      now = new Date();
    await tx.insert(planDocuments).values({
      id: planId,
      engagementId: row.engagementId,
      title: parsed.title,
      createdBy: row.coachId,
      currentVersionId: null,
    });
    await tx.insert(planDocumentDrafts).values({
      id: randomUUID(),
      documentId: planId,
      title: parsed.title,
      html: parsed.html,
      submittedBy: row.coachId,
      submittedAt: now,
    });
    await tx
      .update(onboardingRequests)
      .set({
        status: "awaiting_review",
        planId,
        leaseToken: null,
        leaseUntil: null,
        errorCode: null,
      })
      .where(eq(onboardingRequests.id, row.id));
    await tx.insert(notifications).values({
      id: randomUUID(),
      userId: row.coachId,
      requestId: row.id,
      kind: "draft_ready",
      href: coachDraftReviewHref(row.engagementId, planId),
    });
    return true;
  });
}
export async function failOnboarding(
  job: Pick<OnboardingJob, "id" | "attempts" | "leaseToken">,
) {
  await db
    .update(onboardingRequests)
    .set({
      status: job.attempts >= 3 ? "failed" : "requested",
      errorCode: "preparation_failed",
      leaseToken: null,
      leaseUntil: null,
      nextAttemptAt: new Date(Date.now() + 60_000 * job.attempts),
    })
    .where(
      and(
        eq(onboardingRequests.id, job.id),
        eq(onboardingRequests.status, "preparing"),
        eq(onboardingRequests.leaseToken, job.leaseToken!),
      ),
    );
}
export async function reviewOnboarding(
  tx: Transaction,
  planId: string,
  approve: boolean,
) {
  const [row] = await tx
    .select()
    .from(onboardingRequests)
    .where(
      and(
        eq(onboardingRequests.planId, planId),
        eq(onboardingRequests.status, "awaiting_review"),
      ),
    )
    .for("update");
  if (!row) return;
  await tx
    .update(onboardingRequests)
    .set({ status: approve ? "approved" : "rejected" })
    .where(eq(onboardingRequests.id, row.id));
  await tx.insert(notifications).values({
    id: randomUUID(),
    userId: row.coacheeId,
    requestId: row.id,
    kind: approve ? "plan_approved" : "plan_rejected",
    href: approve ? clientPlanHref(planId) : clientHomeHref,
  });
}
