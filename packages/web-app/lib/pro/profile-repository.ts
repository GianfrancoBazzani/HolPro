import { db, coaches } from "@holpro/db";
import { eq } from "drizzle-orm";
import type { ProfileInput } from "./schemas";
export async function saveCoachProfile(coachId: string, values: ProfileInput) {
  await db
    .update(coaches)
    .set({
      bio: values.bio || null,
      acceptingClients: values.acceptingClients,
    })
    .where(eq(coaches.userId, coachId));
}
