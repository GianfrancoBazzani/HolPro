import { db, users, coaches, coachees } from "@holpro/db";
import { and, eq, isNull, ne } from "drizzle-orm";
import { decideGate } from "./policy";
import type { Portal } from "./portals";
export async function loadUserWithRoles(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    with: { coach: true, coachee: true },
  });
}
export async function loadUserStatus(id: string) {
  const [row] = await db
    .select({ status: users.status, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, id));
  return row;
}
export async function activateVerifiedUser(id: string) {
  await db
    .update(users)
    .set({ status: "active", emailVerifiedAt: new Date() })
    .where(
      and(
        eq(users.id, id),
        ne(users.status, "suspended"),
        isNull(users.deletedAt),
      ),
    );
}
// Locks the user row, decides once more under the lock, then writes identity
// and role in the same transaction. The child table primary key is the final
// guard against a duplicate role.
export async function registerRole(
  id: string,
  portal: Portal,
  name: string,
  timezone: string,
) {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({
        status: users.status,
        deletedAt: users.deletedAt,
        coach: coaches.userId,
        coachee: coachees.userId,
      })
      .from(users)
      .leftJoin(coaches, eq(coaches.userId, users.id))
      .leftJoin(coachees, eq(coachees.userId, users.id))
      .where(eq(users.id, id))
      .for("update");
    const decision = decideGate(user, portal);
    if (decision !== "register") return decision;
    await tx.update(users).set({ name, timezone }).where(eq(users.id, id));
    if (portal.key === "coach") await tx.insert(coaches).values({ userId: id });
    else await tx.insert(coachees).values({ userId: id });
    return "enter" as const;
  });
}
