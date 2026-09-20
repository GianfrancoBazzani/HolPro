"use server";
import { coachContext, attempt } from "./action";
import { parseForm } from "./form";
import { skillSchema, idSchema, limits } from "./schemas";
import {
  reservedSkillNames,
  listCoachSkills,
  writeCoachSkill,
  removeCoachSkill,
} from "./skills-repository";
import type { ProActionState } from "./types";
export async function saveCoachSkill(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(skillSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  const { id, name } = parsed.data;
  if (reservedSkillNames().has(name))
    return { ok: false, fields: { name: [t("validation.skill_name_reserved")] } };
  // At most 20 rows: one read answers uniqueness, the limit and ownership.
  const existing = await listCoachSkills(user.id);
  if (existing.some((skill) => skill.name === name && skill.id !== id))
    return { ok: false, fields: { name: [t("validation.skill_name_taken")] } };
  if (!id && existing.length >= limits.skillsMax)
    return { ok: false, error: t("validation.skills_max", limits) };
  return attempt(
    t,
    async () => !id || existing.some((skill) => skill.id === id),
    () => writeCoachSkill(user.id, parsed.data),
  );
}
export async function deleteCoachSkill(
  _state: ProActionState,
  form: FormData,
): Promise<ProActionState> {
  const { user, dictionary, t } = await coachContext();
  const parsed = parseForm(idSchema, form, dictionary);
  if ("fields" in parsed) return parsed;
  return attempt(
    t,
    async () =>
      (await listCoachSkills(user.id)).some(
        (skill) => skill.id === parsed.data.id,
      ),
    () => removeCoachSkill(user.id, parsed.data.id),
  );
}
