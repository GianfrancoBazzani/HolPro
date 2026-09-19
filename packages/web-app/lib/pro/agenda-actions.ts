"use server";
import { db, agendaEvents } from "@holpro/db";
import { and, eq } from "drizzle-orm";
import { coachContext, attempt } from "./action";
import { ownsEvent, ownsEngagement } from "./ownership";
import { parseForm } from "./form";
import { eventSchema, idSchema } from "./schemas";
import { zonedToUtc } from "./dates";
import type { ProActionState } from "./types";
export async function saveAgendaEvent(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(eventSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  const { id, date, time, ...values } = parsed.data;
  return attempt(
    t,
    async () =>
      (!id || (await ownsEvent(user.id, id))) &&
      (!values.engagementId ||
        (await ownsEngagement(user.id, values.engagementId))),
    async () => {
      const event = {
        ...values,
        startsAt: zonedToUtc(date, time, user.timezone),
      };
      if (id)
        await db
          .update(agendaEvents)
          .set(event)
          .where(
            and(eq(agendaEvents.id, id), eq(agendaEvents.coachId, user.id)),
          );
      else await db.insert(agendaEvents).values({ ...event, coachId: user.id });
    },
  );
}
export async function deleteAgendaEvent(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(idSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  return attempt(
    t,
    () => ownsEvent(user.id, parsed.data.id),
    () =>
      db
        .delete(agendaEvents)
        .where(
          and(
            eq(agendaEvents.id, parsed.data.id),
            eq(agendaEvents.coachId, user.id),
          ),
        ),
  );
}
