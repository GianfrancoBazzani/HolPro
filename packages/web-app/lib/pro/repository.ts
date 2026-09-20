import { db, engagements, agendaEvents } from "@holpro/db";
import { and, eq, asc, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { mapPlanItems } from "@/lib/calendar/repository";
import { addDays, todayIn } from "@/lib/calendar/dates";
import { groupByDay, monthGrid, safeTimezone, zonedToUtc } from "./dates";
import type { AgendaData, Client, ClientPlan } from "./types";
export async function loadClients(coachId: string): Promise<Client[]> {
  const rows = await db.query.engagements.findMany({
    where: and(
      eq(engagements.coachId, coachId),
      eq(engagements.status, "active"),
    ),
    with: { coachee: { with: { user: true } } },
  });
  return rows.map((row) => ({
    engagementId: row.id,
    name: row.coachee.user.name,
    email: row.coachee.user.email,
    image: row.coachee.user.image,
    startedAt: row.startedAt.toISOString(),
  }));
}
export async function loadAgenda(
  coachId: string,
  month: string,
  timezone: string,
): Promise<AgendaData> {
  const zone = safeTimezone(timezone),
    weeks = monthGrid(month);
  const rows = await db.query.agendaEvents.findMany({
    where: and(
      eq(agendaEvents.coachId, coachId),
      gte(agendaEvents.startsAt, zonedToUtc(weeks[0][0], "00:00", zone)),
      lt(
        agendaEvents.startsAt,
        zonedToUtc(addDays(weeks.at(-1)![6], 1), "00:00", zone),
      ),
    ),
    orderBy: [asc(agendaEvents.startsAt), asc(agendaEvents.id)],
    with: { engagement: { with: { coachee: { with: { user: true } } } } },
  });
  const events = rows.map((row) => {
    const linked =
      row.engagement?.coachId === coachId && row.engagement.status === "active";
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      startsAt: row.startsAt.toISOString(),
      durationMinutes: row.durationMinutes,
      note: row.note,
      engagementId: linked ? row.engagementId : null,
      clientName: linked ? row.engagement!.coachee.user.name : null,
    };
  });
  return {
    month,
    today: todayIn(zone),
    timezone: zone,
    weeks,
    events: groupByDay(events, zone),
  };
}
export async function loadClientPlan(
  coachId: string,
  engagementId: string,
  options: { includeEnded?: boolean } = {},
): Promise<ClientPlan | undefined> {
  if (!z.uuid().safeParse(engagementId).success) return undefined;
  const row = await db.query.engagements.findFirst({
    where: and(
      eq(engagements.id, engagementId),
      eq(engagements.coachId, coachId),
      options.includeEnded ? undefined : eq(engagements.status, "active"),
    ),
    with: {
      coach: { with: { user: true } },
      coachee: { with: { user: true } },
      planItems: { with: { checkpoints: true, periods: true } },
    },
  });
  if (!row) return undefined;
  return {
    status: z.enum(["active", "ended"]).parse(row.status),
    client: {
      engagementId: row.id,
      name: row.coachee.user.name,
      email: row.coachee.user.email,
      image: row.coachee.user.image,
      startedAt: row.startedAt.toISOString(),
    },
    calendar: {
      engagements: [
        {
          id: row.id,
          coachName: row.coach.user.name,
          startedAt: row.startedAt.toISOString(),
        },
      ],
      items: mapPlanItems(row),
      preferences: { rowOrder: [], hiddenEngagements: [], hiddenKinds: [] },
    },
  };
}
