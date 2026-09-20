import {
  db,
  engagements,
  agendaEvents,
  planItems,
  planDocuments,
  planCheckpoints,
  planPeriods,
} from "@holpro/db";
import { and, eq } from "drizzle-orm";
import { activeCoach } from "@/lib/mcp/scope";
export async function ownsEngagement(coachId: string, id: string) {
  return (
    (
      await db
        .select({ id: engagements.id })
        .from(engagements)
        .where(and(eq(engagements.id, id), activeCoach(coachId)))
        .limit(1)
    ).length > 0
  );
}
export async function ownsEvent(coachId: string, id: string) {
  return (
    (
      await db
        .select({ id: agendaEvents.id })
        .from(agendaEvents)
        .where(and(eq(agendaEvents.id, id), eq(agendaEvents.coachId, coachId)))
        .limit(1)
    ).length > 0
  );
}
export async function ownsItem(coachId: string, id: string) {
  return (
    (
      await db
        .select({ id: planItems.id })
        .from(planItems)
        .innerJoin(engagements, eq(planItems.engagementId, engagements.id))
        .where(and(eq(planItems.id, id), activeCoach(coachId)))
        .limit(1)
    ).length > 0
  );
}
export async function ownsCheckpoint(coachId: string, id: string) {
  return (
    (
      await db
        .select({ id: planCheckpoints.id })
        .from(planCheckpoints)
        .innerJoin(planItems, eq(planCheckpoints.itemId, planItems.id))
        .innerJoin(engagements, eq(planItems.engagementId, engagements.id))
        .where(and(eq(planCheckpoints.id, id), activeCoach(coachId)))
        .limit(1)
    ).length > 0
  );
}
export async function ownsPeriod(coachId: string, id: string) {
  return (
    (
      await db
        .select({ id: planPeriods.id })
        .from(planPeriods)
        .innerJoin(planItems, eq(planPeriods.itemId, planItems.id))
        .innerJoin(engagements, eq(planItems.engagementId, engagements.id))
        .where(and(eq(planPeriods.id, id), activeCoach(coachId)))
        .limit(1)
    ).length > 0
  );
}

export async function ownsPlanDocument(coachId: string, id: string) {
  const rows = await db
    .select({ id: planDocuments.id })
    .from(planDocuments)
    .innerJoin(engagements, eq(planDocuments.engagementId, engagements.id))
    .where(and(eq(planDocuments.id, id), eq(engagements.coachId, coachId)))
    .limit(1);
  return rows.length > 0;
}
