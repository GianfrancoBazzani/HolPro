import { db, coacheeGoals, engagements } from "@holpro/db";
import { and, eq } from "drizzle-orm";
import { activeCoach } from "@/lib/mcp/scope";
export async function saveCoacheeGoals(
  coacheeId: string,
  goals: string,
  summary: string,
) {
  await db
    .insert(coacheeGoals)
    .values({ coacheeId, goals, summary })
    .onDuplicateKeyUpdate({ set: { goals, summary, updatedAt: new Date() } });
}
export async function loadCoacheeGoals(coacheeId: string) {
  const [row] = await db
    .select()
    .from(coacheeGoals)
    .where(eq(coacheeGoals.coacheeId, coacheeId));
  return row;
}
export async function loadClientGoals(coachId: string, engagementId: string) {
  const [row] = await db
    .select({ goals: coacheeGoals.goals, summary: coacheeGoals.summary })
    .from(engagements)
    .innerJoin(coacheeGoals, eq(coacheeGoals.coacheeId, engagements.coacheeId))
    .where(and(eq(engagements.id, engagementId), activeCoach(coachId)));
  return row ?? null;
}
