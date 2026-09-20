import { sql } from "drizzle-orm";
import {
  mysqlTable,
  int,
  mediumtext,
  datetime,
  uniqueIndex,
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

export const planDocuments = mysqlTable(
  "plan_documents",
  {
    id: id(),
    engagementId: char("engagement_id", { length: 36 })
      .notNull()
      .references(() => engagements.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    currentVersionId: char("current_version_id", { length: 36 }),
    createdBy: char("created_by", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: datetime("deleted_at", { fsp: 3 }),
  },
  (t) => [index("plan_documents_engagement_idx").on(t.engagementId)],
);
export const planDocumentVersions = mysqlTable(
  "plan_document_versions",
  {
    id: id(),
    documentId: char("document_id", { length: 36 })
      .notNull()
      .references(() => planDocuments.id, { onDelete: "cascade" }),
    number: int("number").notNull(),
    html: mediumtext("html").notNull(),
    publishedBy: char("published_by", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("plan_document_versions_document_number_uidx").on(
      t.documentId,
      t.number,
    ),
    check("plan_document_versions_number_check", sql`${t.number} > 0`),
  ],
);

export const planDocumentDrafts = mysqlTable(
  "plan_document_drafts",
  {
    id: id(),
    documentId: char("document_id", { length: 36 })
      .notNull()
      .references(() => planDocuments.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }),
    html: mediumtext("html").notNull(),
    submittedBy: char("submitted_by", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    submittedAt: datetime("submitted_at", { fsp: 3 }).notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("plan_document_drafts_document_uidx").on(t.documentId)],
);

export const planChangeDrafts = mysqlTable(
  "plan_change_drafts",
  {
    id: id(),
    engagementId: char("engagement_id", { length: 36 })
      .notNull()
      .references(() => engagements.id, { onDelete: "cascade" }),
    operations: json("operations").$type<unknown>().notNull(),
    submittedBy: char("submitted_by", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    submittedAt: datetime("submitted_at", { fsp: 3 }).notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("plan_change_drafts_engagement_uidx").on(t.engagementId)],
);
