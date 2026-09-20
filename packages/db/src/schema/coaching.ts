import { sql } from "drizzle-orm";
import {
  mysqlTable,
  char,
  varchar,
  text,
  boolean,
  datetime,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/mysql-core";
import { users, createdAt, updatedAt } from "./auth";
export const coaches = mysqlTable("coaches", {
  userId: char("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  acceptingClients: boolean("accepting_clients").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const coachSpecialties = mysqlTable(
  "coach_specialties",
  {
    coachId: char("coach_id", { length: 36 })
      .notNull()
      .references(() => coaches.userId, { onDelete: "cascade" }),
    specialty: varchar("specialty", { length: 64 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.coachId, t.specialty] })],
);
export const coachees = mysqlTable("coachees", {
  userId: char("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});
export const engagements = mysqlTable(
  "engagements",
  {
    id: char("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    coachId: char("coach_id", { length: 36 })
      .notNull()
      .references(() => coaches.userId, { onDelete: "restrict" }),
    coacheeId: char("coachee_id", { length: 36 })
      .notNull()
      .references(() => coachees.userId, { onDelete: "restrict" }),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    startedAt: datetime("started_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    endedAt: datetime("ended_at", { fsp: 3 }),
  },
  (t) => [
    check("engagements_status_check", sql`${t.status} in ('active', 'ended')`),
    index("engagements_coach_status_idx").on(t.coachId, t.status),
    index("engagements_coachee_status_idx").on(t.coacheeId, t.status),
  ],
);

export const coacheeGoals = mysqlTable("coachee_goals", {
  coacheeId: char("coachee_id", { length: 36 })
    .primaryKey()
    .references(() => coachees.userId, { onDelete: "cascade" }),
  goals: text("goals").notNull(),
  summary: varchar("summary", { length: 280 }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const coachSkills = mysqlTable(
  "coach_skills",
  {
    id: char("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    coachId: char("coach_id", { length: 36 })
      .notNull()
      .references(() => coaches.userId, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    description: varchar("description", { length: 1024 }).notNull(),
    instructions: text("instructions").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("coach_skills_coach_name_idx").on(t.coachId, t.name)],
);
