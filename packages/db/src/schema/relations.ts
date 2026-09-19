import { relations } from "drizzle-orm";
import { users, sessions, accounts } from "./auth";
import { coaches, coachees, coachSpecialties, engagements } from "./coaching";
export const usersRelations = relations(users, ({ one, many }) => ({
  coach: one(coaches),
  coachee: one(coachees),
  sessions: many(sessions),
  accounts: many(accounts),
}));
export const coachesRelations = relations(coaches, ({ one, many }) => ({
  user: one(users, { fields: [coaches.userId], references: [users.id] }),
  specialties: many(coachSpecialties),
  engagements: many(engagements),
}));
export const coacheesRelations = relations(coachees, ({ one, many }) => ({
  user: one(users, { fields: [coachees.userId], references: [users.id] }),
  engagements: many(engagements),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
export const specialtiesRelations = relations(coachSpecialties, ({ one }) => ({
  coach: one(coaches, {
    fields: [coachSpecialties.coachId],
    references: [coaches.userId],
  }),
}));
export const engagementsRelations = relations(engagements, ({ one }) => ({
  coach: one(coaches, {
    fields: [engagements.coachId],
    references: [coaches.userId],
  }),
  coachee: one(coachees, {
    fields: [engagements.coacheeId],
    references: [coachees.userId],
  }),
}));
