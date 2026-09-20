import { sql } from "drizzle-orm";
import {
  mysqlTable,
  char,
  varchar,
  bigint,
  datetime,
  uniqueIndex,
  check,
} from "drizzle-orm/mysql-core";
import { users, createdAt, updatedAt } from "./auth";
export const telegramLinks = mysqlTable(
  "telegram_links",
  {
    id: char("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 8 }).$type<"coach" | "coachee">().notNull(),
    telegramUserId: bigint("telegram_user_id", { mode: "number" }),
    telegramChatId: bigint("telegram_chat_id", { mode: "number" }),
    telegramUsername: varchar("telegram_username", { length: 64 }),
    tokenHash: char("token_hash", { length: 64 }),
    tokenExpiresAt: datetime("token_expires_at", { fsp: 3 }),
    linkedAt: datetime("linked_at", { fsp: 3 }),
    revokedAt: datetime("revoked_at", { fsp: 3 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("telegram_links_user_uidx").on(t.userId),
    uniqueIndex("telegram_links_telegram_user_uidx").on(t.telegramUserId),
    uniqueIndex("telegram_links_token_uidx").on(t.tokenHash),
    check("telegram_links_role_check", sql`${t.role} in ('coach', 'coachee')`),
    check(
      "telegram_links_state_check",
      sql`(
    (${t.telegramUserId} is null and ${t.telegramChatId} is null and ${t.telegramUsername} is null and ${t.linkedAt} is null and ${t.tokenHash} is not null and ${t.tokenExpiresAt} is not null)
    or (${t.telegramUserId} is not null and ${t.telegramChatId} is not null and ${t.linkedAt} is not null and ${t.tokenHash} is null and ${t.tokenExpiresAt} is null)
  )`,
    ),
  ],
);
export type TelegramLink = typeof telegramLinks.$inferSelect;
