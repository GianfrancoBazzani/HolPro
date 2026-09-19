"use server";
import { db, calendarPreferences } from "@holpro/db";
import { requirePortalUser } from "@/lib/auth/gate";
import { portals } from "@/lib/auth/portals";
import { calendarPreferencesSchema } from "./schemas";
export async function saveCalendarPreferences(
  input: unknown,
): Promise<{ ok: boolean }> {
  const user = await requirePortalUser(portals.coachee);
  const parsed = calendarPreferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  try {
    await db
      .insert(calendarPreferences)
      .values({ userId: user.id, ...parsed.data })
      .onDuplicateKeyUpdate({ set: parsed.data });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
