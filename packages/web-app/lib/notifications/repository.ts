import { randomUUID, createHash } from "node:crypto";
import {
  db,
  notifications,
  pushSubscriptions,
  users,
  sessions,
} from "@holpro/db";
import { and, eq, isNull, lte, or, asc, desc, lt, gt } from "drizzle-orm";
import { pushInput } from "./push-input";
import { activeUser } from "@/lib/auth/queries";
export async function listNotifications(userId: string) {
  return db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      href: notifications.href,
      readAt: notifications.readAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(30);
}
export async function markNotificationRead(userId: string, id: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}
export async function savePushSubscription(
  userId: string,
  sessionId: string,
  input: unknown,
) {
  const [session] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        gt(sessions.expiresAt, new Date()),
      ),
    );
  if (!session) throw new Error("forbidden");
  const { endpoint, keys } = pushInput.parse(input);
  await db
    .insert(pushSubscriptions)
    .values({
      id: randomUUID(),
      userId,
      sessionId,
      endpoint,
      endpointHash: createHash("sha256").update(endpoint).digest("hex"),
      ...keys,
    })
    .onDuplicateKeyUpdate({ set: { userId, sessionId, ...keys } });
}
export async function removePushSubscription(userId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(
          pushSubscriptions.endpointHash,
          createHash("sha256").update(endpoint).digest("hex"),
        ),
      ),
    );
}
export async function claimNotification() {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [row] = await tx
      .select()
      .from(notifications)
      .where(
        and(
          isNull(notifications.deliveredAt),
          lt(notifications.attempts, 5),
          lte(notifications.nextAttemptAt, now),
          or(
            isNull(notifications.leaseUntil),
            lte(notifications.leaseUntil, now),
          ),
        ),
      )
      .orderBy(asc(notifications.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!row) return null;
    const lease = {
      leaseToken: randomUUID(),
      leaseUntil: new Date(now.getTime() + 5 * 60_000),
      attempts: row.attempts + 1,
    };
    await tx
      .update(notifications)
      .set(lease)
      .where(eq(notifications.id, row.id));
    return { ...row, ...lease };
  });
}
export async function notificationRecipient(userId: string) {
  const now = new Date();
  const [[user], subscriptions] = await Promise.all([
    db
      .select({ id: users.id, email: users.email, locale: users.locale })
      .from(users)
      .where(activeUser(userId)),
    db
      .select({
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .innerJoin(sessions, eq(sessions.id, pushSubscriptions.sessionId))
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(sessions.userId, userId),
          gt(sessions.expiresAt, now),
        ),
      )
      .limit(20),
  ]);
  return { user, subscriptions: user ? subscriptions : [] };
}
export async function finishNotification(
  row: NonNullable<Awaited<ReturnType<typeof claimNotification>>>,
  success: boolean,
) {
  await db
    .update(notifications)
    .set({
      leaseToken: null,
      leaseUntil: null,
      ...(success
        ? { deliveredAt: new Date() }
        : { nextAttemptAt: new Date(Date.now() + 60_000 * 2 ** row.attempts) }),
    })
    .where(
      and(
        eq(notifications.id, row.id),
        eq(notifications.leaseToken, row.leaseToken),
      ),
    );
}

export async function hasPushSubscription(userId: string, sessionId: string) {
  const [row] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.sessionId, sessionId),
      ),
    )
    .limit(1);
  return !!row;
}
