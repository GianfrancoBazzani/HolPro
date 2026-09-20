import { db, telegramLinks, users, type TelegramLink } from "@holpro/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import { issueToken, hashToken, validToken } from "./tokens";
import type { PortalKey } from "@/lib/auth/portals";
export type { TelegramLink };
export type TelegramIdentity = {
  userId: number;
  chatId: number;
  username: string | null;
};
export const findUserLink = async (userId: string) =>
  (
    await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.userId, userId))
  )[0];
export const findTelegramLink = async (id: number) =>
  (
    await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.telegramUserId, id))
  )[0];
export async function requestLink(userId: string, role: PortalKey) {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    const [old] = await tx
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.userId, userId))
      .for("update");
    if (old?.linkedAt || old?.revokedAt) return { link: old };
    const token = issueToken();
    const id = crypto.randomUUID();
    if (old) await tx.delete(telegramLinks).where(eq(telegramLinks.id, old.id));
    await tx
      .insert(telegramLinks)
      .values({
        id,
        userId,
        role,
        tokenHash: token.hash,
        tokenExpiresAt: token.expiresAt,
      });
    const [link] = await tx
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.id, id));
    return { link, token: token.token };
  });
}
export async function cancelLink(userId: string, id: string) {
  await db
    .delete(telegramLinks)
    .where(
      and(
        eq(telegramLinks.userId, userId),
        eq(telegramLinks.id, id),
        isNull(telegramLinks.linkedAt),
        isNull(telegramLinks.revokedAt),
      ),
    );
}
export async function pendingLink(token: string) {
  if (!validToken(token)) return undefined;
  return (
    await db
      .select()
      .from(telegramLinks)
      .where(
        and(
          eq(telegramLinks.tokenHash, hashToken(token)),
          gt(telegramLinks.tokenExpiresAt, new Date()),
          isNull(telegramLinks.revokedAt),
        ),
      )
  )[0];
}
export async function consumeLink(
  token: string,
  identity: TelegramIdentity,
  beforeLink: (link: TelegramLink) => Promise<void>,
) {
  if (!validToken(token)) return "linkInvalid" as const;
  try {
    return await db.transaction(async (tx) => {
      const predicate = and(
        eq(telegramLinks.tokenHash, hashToken(token)),
        gt(telegramLinks.tokenExpiresAt, new Date()),
        isNull(telegramLinks.revokedAt),
        isNull(telegramLinks.linkedAt),
      );
      const [link] = await tx
        .select()
        .from(telegramLinks)
        .where(predicate)
        .for("update");
      if (!link) return "linkInvalid" as const;
      const [owner] = await tx
        .select()
        .from(telegramLinks)
        .where(eq(telegramLinks.telegramUserId, identity.userId));
      if (owner) return "alreadyLinked" as const;
      await beforeLink(link);
      // Re-check expiry after cleanup; the row remains locked throughout.
      if (link.tokenExpiresAt!.getTime() <= Date.now())
        return "linkInvalid" as const;
      await tx
        .update(telegramLinks)
        .set({
          telegramUserId: identity.userId,
          telegramChatId: identity.chatId,
          telegramUsername: identity.username,
          tokenHash: null,
          tokenExpiresAt: null,
          linkedAt: new Date(),
        })
        .where(predicate);
      return {
        ...link,
        telegramUserId: identity.userId,
        telegramChatId: identity.chatId,
        telegramUsername: identity.username,
        tokenHash: null,
        tokenExpiresAt: null,
        linkedAt: new Date(),
      };
    });
  } catch (error) {
    const cause = error as { cause?: { code?: string }; code?: string };
    if ((cause.cause?.code ?? cause.code) === "ER_DUP_ENTRY")
      return "alreadyLinked" as const;
    throw error;
  }
}
export async function revokeLink(userId: string) {
  await db
    .update(telegramLinks)
    .set({ revokedAt: new Date() })
    .where(eq(telegramLinks.userId, userId));
  return findUserLink(userId);
}
export async function deleteRevokedLink(id: string) {
  const { isNotNull } = await import("drizzle-orm");
  await db
    .delete(telegramLinks)
    .where(and(eq(telegramLinks.id, id), isNotNull(telegramLinks.revokedAt)));
}
