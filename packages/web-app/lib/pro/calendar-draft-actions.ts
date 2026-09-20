"use server";
import { z } from "zod";
import { refresh } from "next/cache";
import { coachContext, attempt } from "./action";
import { ownsEngagement } from "./ownership";
import { parseForm } from "./form";
import type { ProActionState } from "./types";
import {
  applyCalendarDraft as approve,
  discardCalendarDraft as discard,
} from "@/lib/calendar/draft-repository";
import { PlanDraftChangedError } from "@/lib/plans/types";
const reviewSchema = z.object({ engagementId: z.uuid(), draftId: z.uuid() });
async function review(
  form: FormData,
  write: typeof approve | typeof discard,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(reviewSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  let changed = false;
  const result = await attempt(
    t,
    () => ownsEngagement(user.id, parsed.data.engagementId),
    async () => {
      try {
        await write(user.id, parsed.data.engagementId, parsed.data.draftId);
      } catch (error) {
        changed = error instanceof PlanDraftChangedError;
        throw error;
      }
    },
  );
  if (changed) {
    refresh();
    return { ok: false, error: t("error.draftChanged") };
  }
  return result;
}
export async function approveCalendarDraft(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  return review(form, approve);
}
export async function discardCalendarDraft(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  return review(form, discard);
}
