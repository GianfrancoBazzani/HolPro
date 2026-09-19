import { sql } from "drizzle-orm";
import {
  mysqlTable,
  char,
  varchar,
  text,
  int,
  datetime,
  index,
  check,
} from "drizzle-orm/mysql-core";
import { createdAt, updatedAt } from "./auth";
import { coaches, engagements } from "./coaching";
export const agendaEventKinds = ["call", "event"] as const;
export type AgendaEventKind = (typeof agendaEventKinds)[number];
const kindLiterals = sql.raw(agendaEventKinds.map((v) => `'${v}'`).join(", "));
export const agendaEvents = mysqlTable(
  "agenda_events",
  {
    id: char("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    coachId: char("coach_id", { length: 36 })
      .notNull()
      .references(() => coaches.userId, { onDelete: "cascade" }),
    engagementId: char("engagement_id", { length: 36 }).references(
      () => engagements.id,
      { onDelete: "set null" },
    ),
    kind: varchar("kind", { length: 12 })
      .$type<AgendaEventKind>()
      .notNull()
      .default("call"),
    title: varchar("title", { length: 120 }).notNull(),
    startsAt: datetime("starts_at", { fsp: 3 }).notNull(),
    durationMinutes: int("duration_minutes").notNull().default(60),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("agenda_events_coach_starts_idx").on(t.coachId, t.startsAt),
    check("agenda_events_kind_check", sql`${t.kind} in (${kindLiterals})`),
    check(
      "agenda_events_duration_check",
      sql`${t.durationMinutes} between 5 and 1440`,
    ),
  ],
);
