import type { ItemKind, CheckpointStatus } from "@holpro/db/schema";
import type { CalendarPreferences } from "./schemas";
export type CalendarCheckpoint = {
  id: string;
  date: string;
  title: string;
  note: string | null;
  status: CheckpointStatus;
};
export type CalendarPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  note: string | null;
};
export type CalendarItem = {
  id: string;
  engagementId: string;
  kind: ItemKind;
  title: string;
  description: string | null;
  createdAt: string;
  checkpoints: CalendarCheckpoint[];
  periods: CalendarPeriod[];
};
export type CalendarData = {
  engagements: { id: string; coachName: string; startedAt: string }[];
  items: CalendarItem[];
  preferences: CalendarPreferences;
};
