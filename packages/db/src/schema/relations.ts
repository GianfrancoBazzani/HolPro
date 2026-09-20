import { relations } from "drizzle-orm";
import { users, sessions, accounts } from "./auth";
import {
  coaches,
  coachees,
  coachSpecialties,
  coachSkills,
  engagements,
} from "./coaching";
import {
  planChangeDrafts,
  planDocuments,
  planDocumentVersions,
  planItems,
  planCheckpoints,
  planPeriods,
  calendarPreferences,
} from "./plans";
import { agendaEvents } from "./agenda";
export const usersRelations = relations(users, ({ one, many }) => ({
  calendarPreference: one(calendarPreferences),
  coach: one(coaches),
  coachee: one(coachees),
  sessions: many(sessions),
  accounts: many(accounts),
}));
export const coachesRelations = relations(coaches, ({ one, many }) => ({
  user: one(users, { fields: [coaches.userId], references: [users.id] }),
  specialties: many(coachSpecialties),
  skills: many(coachSkills),
  engagements: many(engagements),
  agendaEvents: many(agendaEvents),
}));
export const coachSkillsRelations = relations(coachSkills, ({ one }) => ({
  coach: one(coaches, {
    fields: [coachSkills.coachId],
    references: [coaches.userId],
  }),
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
export const engagementsRelations = relations(engagements, ({ one, many }) => ({
  changeDraft: one(planChangeDrafts),
  planDocuments: many(planDocuments),
  planItems: many(planItems),
  agendaEvents: many(agendaEvents),
  coach: one(coaches, {
    fields: [engagements.coachId],
    references: [coaches.userId],
  }),
  coachee: one(coachees, {
    fields: [engagements.coacheeId],
    references: [coachees.userId],
  }),
}));
export const planItemsRelations = relations(planItems, ({ one, many }) => ({
  engagement: one(engagements, {
    fields: [planItems.engagementId],
    references: [engagements.id],
  }),
  checkpoints: many(planCheckpoints),
  periods: many(planPeriods),
}));
export const planCheckpointsRelations = relations(
  planCheckpoints,
  ({ one }) => ({
    item: one(planItems, {
      fields: [planCheckpoints.itemId],
      references: [planItems.id],
    }),
  }),
);
export const planPeriodsRelations = relations(planPeriods, ({ one }) => ({
  item: one(planItems, {
    fields: [planPeriods.itemId],
    references: [planItems.id],
  }),
}));
export const calendarPreferencesRelations = relations(
  calendarPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [calendarPreferences.userId],
      references: [users.id],
    }),
  }),
);
export const agendaEventsRelations = relations(agendaEvents, ({ one }) => ({
  coach: one(coaches, {
    fields: [agendaEvents.coachId],
    references: [coaches.userId],
  }),
  engagement: one(engagements, {
    fields: [agendaEvents.engagementId],
    references: [engagements.id],
  }),
}));

export const planDocumentsRelations = relations(
  planDocuments,
  ({ one, many }) => ({
    engagement: one(engagements, {
      fields: [planDocuments.engagementId],
      references: [engagements.id],
    }),
    versions: many(planDocumentVersions, { relationName: "documentVersions" }),
    currentVersion: one(planDocumentVersions, {
      fields: [planDocuments.currentVersionId],
      references: [planDocumentVersions.id],
      relationName: "currentDocumentVersion",
    }),
  }),
);
export const planDocumentVersionsRelations = relations(
  planDocumentVersions,
  ({ one }) => ({
    document: one(planDocuments, {
      fields: [planDocumentVersions.documentId],
      references: [planDocuments.id],
      relationName: "documentVersions",
    }),
  }),
);

export const planChangeDraftsRelations = relations(
  planChangeDrafts,
  ({ one }) => ({
    engagement: one(engagements, {
      fields: [planChangeDrafts.engagementId],
      references: [engagements.id],
    }),
  }),
);
