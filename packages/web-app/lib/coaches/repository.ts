import { db, coaches, coachSpecialties, users } from "@holpro/db";
import {
  and,
  asc,
  eq,
  exists,
  inArray,
  isNull,
  like,
  or,
  sql,
} from "drizzle-orm";
import type { CoachSummary } from "@/lib/mcp/schemas";
export const searchLimit = 50;
// MySQL LIKE treats %, _ and the backslash specially. The pattern is bound as a
// parameter, so escaping is the only step needed.
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
export async function searchCoaches(query?: string): Promise<CoachSummary[]> {
  const term = query?.trim();
  const pattern = term ? `%${escapeLike(term)}%` : undefined;
  const matches = pattern
    ? or(
        like(users.name, pattern),
        like(coaches.bio, pattern),
        exists(
          db
            .select({ one: sql`1` })
            .from(coachSpecialties)
            .where(
              and(
                eq(coachSpecialties.coachId, coaches.userId),
                like(coachSpecialties.specialty, pattern),
              ),
            ),
        ),
      )
    : undefined;
  const rows = await db
    .select({ coachId: coaches.userId, name: users.name, bio: coaches.bio })
    .from(coaches)
    .innerJoin(users, eq(users.id, coaches.userId))
    .where(
      and(
        eq(coaches.acceptingClients, true),
        eq(users.status, "active"),
        isNull(users.deletedAt),
        matches,
      ),
    )
    .orderBy(asc(users.name), asc(coaches.userId))
    .limit(searchLimit);
  if (!rows.length) return [];
  const specialties = await db
    .select({
      coachId: coachSpecialties.coachId,
      specialty: coachSpecialties.specialty,
    })
    .from(coachSpecialties)
    .where(
      inArray(
        coachSpecialties.coachId,
        rows.map((row) => row.coachId),
      ),
    );
  const byCoach = new Map<string, string[]>();
  for (const entry of specialties)
    (byCoach.get(entry.coachId) ??
      byCoach.set(entry.coachId, []).get(entry.coachId)!).push(entry.specialty);
  return rows.map((row) => ({
    coachId: row.coachId,
    name: row.name,
    bio: row.bio ?? "",
    specialties: byCoach.get(row.coachId) ?? [],
  }));
}
