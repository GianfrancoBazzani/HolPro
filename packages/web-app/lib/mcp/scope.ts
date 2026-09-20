import { and, eq } from "drizzle-orm";
import { engagements } from "@holpro/db/schema";
import type { McpActor } from "./actor";
export const activeCoach = (coachId: string) =>
  and(eq(engagements.coachId, coachId), eq(engagements.status, "active"));
export function readScope(actor: McpActor) {
  return actor.role === "coach"
    ? eq(engagements.coachId, actor.userId)
    : and(
        eq(engagements.coacheeId, actor.userId),
        eq(engagements.status, "active"),
      );
}
export const publishScope = (actor: McpActor) => activeCoach(actor.userId);
