"use server";
import { db, planItems, planCheckpoints, planPeriods } from "@holpro/db";
import { eq } from "drizzle-orm";
import { coachContext, attempt } from "./action";
import {
  ownsEngagement,
  ownsItem,
  ownsCheckpoint,
  ownsPeriod,
} from "./ownership";
import { parseForm } from "./form";
import {
  itemSchema,
  checkpointSchema,
  periodSchema,
  idSchema,
} from "./schemas";
import type { ProActionState } from "./types";
export async function savePlanItem(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(itemSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  const { id, engagementId, ...values } = parsed.data;
  return attempt(
    t,
    () => (id ? ownsItem(user.id, id) : ownsEngagement(user.id, engagementId!)),
    async () => {
      if (id)
        await db.update(planItems).set(values).where(eq(planItems.id, id));
      else
        await db
          .insert(planItems)
          .values({ ...values, engagementId: engagementId! });
    },
  );
}
export async function deletePlanItem(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(idSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  return attempt(
    t,
    () => ownsItem(user.id, parsed.data.id),
    () => db.delete(planItems).where(eq(planItems.id, parsed.data.id)),
  );
}
export async function savePlanCheckpoint(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(checkpointSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  const { id, itemId, ...values } = parsed.data;
  return attempt(
    t,
    () => (id ? ownsCheckpoint(user.id, id) : ownsItem(user.id, itemId!)),
    async () => {
      if (id)
        await db
          .update(planCheckpoints)
          .set(values)
          .where(eq(planCheckpoints.id, id));
      else
        await db.insert(planCheckpoints).values({ ...values, itemId: itemId! });
    },
  );
}
export async function deletePlanCheckpoint(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(idSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  return attempt(
    t,
    () => ownsCheckpoint(user.id, parsed.data.id),
    () =>
      db.delete(planCheckpoints).where(eq(planCheckpoints.id, parsed.data.id)),
  );
}
export async function savePlanPeriod(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(periodSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  const { id, itemId, ...values } = parsed.data;
  return attempt(
    t,
    () => (id ? ownsPeriod(user.id, id) : ownsItem(user.id, itemId!)),
    async () => {
      if (id)
        await db.update(planPeriods).set(values).where(eq(planPeriods.id, id));
      else await db.insert(planPeriods).values({ ...values, itemId: itemId! });
    },
  );
}
export async function deletePlanPeriod(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(idSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  return attempt(
    t,
    () => ownsPeriod(user.id, parsed.data.id),
    () => db.delete(planPeriods).where(eq(planPeriods.id, parsed.data.id)),
  );
}
