import { db, engagements, calendarPreferences, itemKinds } from "@holpro/db";
import { and, eq, asc } from "drizzle-orm";
import type { CalendarData } from "./types";
export async function loadCalendar(userId: string): Promise<CalendarData> {
  const [rows, saved] = await Promise.all([
    db.query.engagements.findMany({
      where: and(
        eq(engagements.coacheeId, userId),
        eq(engagements.status, "active"),
      ),
      orderBy: [asc(engagements.startedAt), asc(engagements.id)],
      with: {
        coach: { with: { user: true } },
        planItems: { with: { checkpoints: true, periods: true } },
      },
    }),
    db.query.calendarPreferences.findFirst({
      where: eq(calendarPreferences.userId, userId),
    }),
  ]);
  const items = rows.flatMap(mapPlanItems);
  const knownItems = new Set(items.map((item) => item.id)),
    knownEngagements = new Set(rows.map((row) => row.id));
  const strings = (values: unknown): string[] =>
    Array.isArray(values)
      ? [...new Set(values.filter((v): v is string => typeof v === "string"))]
      : [];
  return {
    engagements: rows.map((row) => ({
      id: row.id,
      coachName: row.coach.user.name,
      startedAt: row.startedAt.toISOString(),
    })),
    items,
    preferences: {
      rowOrder: strings(saved?.rowOrder).filter((id) => knownItems.has(id)),
      hiddenEngagements: strings(saved?.hiddenEngagements).filter((id) =>
        knownEngagements.has(id),
      ),
      hiddenKinds: strings(saved?.hiddenKinds).filter(
        (kind): kind is (typeof itemKinds)[number] =>
          itemKinds.some((value) => value === kind),
      ),
    },
  };
}

type PlanRow = typeof import("@holpro/db").planItems.$inferSelect & {
  checkpoints: (typeof import("@holpro/db").planCheckpoints.$inferSelect)[];
  periods: (typeof import("@holpro/db").planPeriods.$inferSelect)[];
};
export function mapPlanItems(engagement: { id: string; planItems: PlanRow[] }) {
  return engagement.planItems.map((item) => ({
    id: item.id,
    engagementId: engagement.id,
    kind: item.kind,
    title: item.title,
    description: item.description,
    createdAt: item.createdAt.toISOString(),
    checkpoints: item.checkpoints.map(({ id, date, title, note, status }) => ({
      id,
      date,
      title,
      note,
      status,
    })),
    periods: item.periods.map(({ id, startDate, endDate, title, note }) => ({
      id,
      startDate,
      endDate,
      title,
      note,
    })),
  }));
}
