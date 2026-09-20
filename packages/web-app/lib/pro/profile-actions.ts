"use server";
import { coachContext, attempt } from "./action";
import { parseForm } from "./form";
import { profileSchema } from "./schemas";
import { saveCoachProfile } from "./profile-repository";
import type { ProActionState } from "./types";
export async function updateCoachProfile(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(profileSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  // The gate already proved the coach role; the row is the coach's own.
  return attempt(
    t,
    async () => true,
    () => saveCoachProfile(user.id, parsed.data),
  );
}
