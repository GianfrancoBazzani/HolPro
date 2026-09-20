"use server";
import { z } from "zod";
import { refresh } from "next/cache";
import { coachContext, attempt } from "./action";
import { ownsPlanDocument } from "./ownership";
import { parseForm } from "./form";
import type { ProActionState } from "./types";
import {
  approvePlanDraft as approve,
  discardPlanDraft as discard,
} from "@/lib/plans/repository";
import { PlanDraftChangedError } from "@/lib/plans/types";
const reviewSchema = z.object({ id: z.uuid(), draftId: z.uuid() });
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
    () => ownsPlanDocument(user.id, parsed.data.id),
    async () => {
      try {
        await write(user.id, parsed.data.id, parsed.data.draftId);
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
export async function approvePlanDraft(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  return review(form, approve);
}
export async function discardPlanDraft(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  return review(form, discard);
}
