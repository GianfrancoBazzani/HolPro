import type { AgendaEventKind } from "@holpro/db/schema";
import type { CalendarData } from "@/lib/calendar/types";
export type AgendaEvent = {
  id: string;
  kind: AgendaEventKind;
  title: string;
  startsAt: string;
  durationMinutes: number;
  note: string | null;
  engagementId: string | null;
  clientName: string | null;
};
export type AgendaData = {
  month: string;
  today: string;
  timezone: string;
  weeks: string[][];
  events: Record<string, AgendaEvent[]>;
};
export type Client = {
  engagementId: string;
  name: string;
  email: string;
  image: string | null;
  startedAt: string;
};
export type ClientPlan = { client: Client; calendar: CalendarData };
export type ProActionState = {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string[] | undefined>;
};
export type ProAction = (
  state: ProActionState,
  form: FormData,
) => Promise<ProActionState>;
