import { sql } from "drizzle-orm";
import {
  mysqlTable,
  char,
  varchar,
  text,
  boolean,
  datetime,
  bigint,
  int,
  index,
  check,
} from "drizzle-orm/mysql-core";
export const createdAt = () =>
  datetime("created_at", { fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`);
export const updatedAt = () =>
  datetime("updated_at", { fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date());
export const users = mysqlTable(
  "users",
  {
    id: char("id", { length: 36 }).primaryKey(),
    name: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image_url"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    locale: varchar("locale", { length: 12 }).notNull().default("en"),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    emailVerifiedAt: datetime("email_verified_at", { fsp: 3 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: datetime("deleted_at", { fsp: 3 }),
  },
  (t) => [
    check(
      "users_status_check",
      sql`${t.status} in ('pending', 'active', 'suspended')`,
    ),
  ],
);
export const sessions = mysqlTable(
  "sessions",
  {
    id: char("id", { length: 36 }).primaryKey(),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: datetime("expires_at", { fsp: 3 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);
export const accounts = mysqlTable(
  "accounts",
  {
    id: char("id", { length: 36 }).primaryKey(),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: datetime("access_token_expires_at", { fsp: 3 }),
    refreshTokenExpiresAt: datetime("refresh_token_expires_at", { fsp: 3 }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);
export const verifications = mysqlTable(
  "verifications",
  {
    id: char("id", { length: 36 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: datetime("expires_at", { fsp: 3 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);
export const rateLimits = mysqlTable("rate_limits", {
  id: char("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  count: int("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
