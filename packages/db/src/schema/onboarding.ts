import { sql } from "drizzle-orm";
import {
  mysqlTable,
  char,
  varchar,
  text,
  datetime,
  int,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/mysql-core";
import { users, sessions, createdAt, updatedAt } from "./auth";
import { coaches, coachees, engagements } from "./coaching";
import { planDocuments } from "./plans";
export const onboardingStatuses = [
  "requested",
  "preparing",
  "awaiting_review",
  "approved",
  "rejected",
  "failed",
] as const;
export const onboardingRequests = mysqlTable(
  "onboarding_requests",
  {
    id: char("id", { length: 36 }).primaryKey(),
    coachId: char("coach_id", { length: 36 })
      .notNull()
      .references(() => coaches.userId),
    coacheeId: char("coachee_id", { length: 36 })
      .notNull()
      .references(() => coachees.userId),
    engagementId: char("engagement_id", { length: 36 })
      .notNull()
      .references(() => engagements.id),
    planId: char("plan_id", { length: 36 }).references(() => planDocuments.id),
    goals: text("goals").notNull(),
    status: varchar("status", { length: 24 })
      .$type<(typeof onboardingStatuses)[number]>()
      .notNull()
      .default("requested"),
    attempts: int("attempts").notNull().default(0),
    leaseToken: char("lease_token", { length: 36 }),
    leaseUntil: datetime("lease_until", { fsp: 3 }),
    nextAttemptAt: datetime("next_attempt_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    errorCode: varchar("error_code", { length: 64 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("onboarding_pair_uidx").on(t.coacheeId, t.coachId),
    index("onboarding_queue_idx").on(t.status, t.nextAttemptAt, t.leaseUntil),
    index("onboarding_coach_idx").on(t.coachId, t.createdAt),
    check(
      "onboarding_status_check",
      sql`${t.status} in (${sql.raw(
        onboardingStatuses.map((status) => `'${status}'`).join(","),
      )})`,
    ),
  ],
);
export const notifications = mysqlTable(
  "notifications",
  {
    id: char("id", { length: 36 }).primaryKey(),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestId: char("request_id", { length: 36 })
      .notNull()
      .references(() => onboardingRequests.id),
    kind: varchar("kind", { length: 24 })
      .$type<"draft_ready" | "plan_approved" | "plan_rejected">()
      .notNull(),
    href: varchar("href", { length: 512 }).notNull(),
    readAt: datetime("read_at", { fsp: 3 }),
    deliveredAt: datetime("delivered_at", { fsp: 3 }),
    attempts: int("attempts").notNull().default(0),
    nextAttemptAt: datetime("next_attempt_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    leaseToken: char("lease_token", { length: 36 }),
    leaseUntil: datetime("lease_until", { fsp: 3 }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("notifications_request_kind_uidx").on(t.requestId, t.kind),
    index("notifications_user_idx").on(t.userId, t.createdAt),
    // The worker claims the oldest undelivered row that is due.
    index("notifications_queue_idx").on(
      t.deliveredAt,
      t.nextAttemptAt,
      t.createdAt,
    ),
  ],
);
export const pushSubscriptions = mysqlTable(
  "push_subscriptions",
  {
    id: char("id", { length: 36 }).primaryKey(),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: char("session_id", { length: 36 })
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    endpointHash: char("endpoint_hash", { length: 64 }).notNull(),
    p256dh: varchar("p256dh", { length: 128 }).notNull(),
    auth: varchar("auth", { length: 64 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("push_endpoint_uidx").on(t.endpointHash),
    index("push_user_idx").on(t.userId),
  ],
);
