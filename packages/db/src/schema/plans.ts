import { sql } from "drizzle-orm";
import {
  mysqlTable,
  char,
  varchar,
  text,
  date,
  json,
  index,
  check,
} from "drizzle-orm/mysql-core";
import { users, createdAt, updatedAt } from "./auth";
import { engagements } from "./coaching";
export const itemKinds = [
  "training",
  "nutrition",
  "supplementation",
  "mindset",
  "habits",
  "health",
  "other",
] as const;
export type ItemKind = (typeof itemKinds)[number];
export const checkpointStatuses = ["planned", "done", "skipped"] as const;
export type CheckpointStatus = (typeof checkpointStatuses)[number];
const literals = (values: readonly string[]) =>
  sql.raw(values.map((v) => `'${v}'`).join(", "));
const id = () =>
  char("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
export const planItems = mysqlTable(
  "plan_items",
  {
    id: id(),
    engagementId: char("engagement_id", { length: 36 })
      .notNull()
      .references(() => engagements.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 24 }).$type<ItemKind>().notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("plan_items_engagement_idx").on(t.engagementId),
    check("plan_items_kind_check", sql`${t.kind} in (${literals(itemKinds)})`),
  ],
);
export const planCheckpoints = mysqlTable(
  "plan_checkpoints",
  {
    id: id(),
    itemId: char("item_id", { length: 36 })
      .notNull()
      .references(() => planItems.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    note: text("note"),
    status: varchar("status", { length: 12 })
      .$type<CheckpointStatus>()
      .notNull()
      .default("planned"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("plan_checkpoints_item_date_idx").on(t.itemId, t.date),
    check(
      "plan_checkpoints_status_check",
      sql`${t.status} in (${literals(checkpointStatuses)})`,
    ),
  ],
);
export const planPeriods = mysqlTable(
  "plan_periods",
  {
    id: id(),
    itemId: char("item_id", { length: 36 })
      .notNull()
      .references(() => planItems.id, { onDelete: "cascade" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("plan_periods_item_start_idx").on(t.itemId, t.startDate),
    check("plan_periods_dates_check", sql`${t.endDate} >= ${t.startDate}`),
  ],
);
export const calendarPreferences = mysqlTable("calendar_preferences", {
  userId: char("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  rowOrder: json("row_order")
    .$type<string[]>()
    .notNull()
    .default(sql`('[]')`),
  hiddenEngagements: json("hidden_engagements")
    .$type<string[]>()
    .notNull()
    .default(sql`('[]')`),
  hiddenKinds: json("hidden_kinds")
    .$type<ItemKind[]>()
    .notNull()
    .default(sql`('[]')`),
  updatedAt: updatedAt(),
});
