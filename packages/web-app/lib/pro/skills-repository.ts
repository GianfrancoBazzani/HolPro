import { readdirSync } from "node:fs";
import path from "node:path";
import { db, coachSkills } from "@holpro/db";
import { and, asc, eq } from "drizzle-orm";
import { resolveSkillsDir } from "@/lib/assistant/skills-dir";
import type { SkillInput } from "./schemas";
import type { CoachSkill } from "./types";
let reserved: Set<string> | undefined;
// Built-in workspace skills win on a name conflict in Mastra, so a coach
// skill may not reuse one of their directory names.
export function reservedSkillNames() {
  reserved ??= new Set(
    readdirSync(path.join(resolveSkillsDir(), "skills"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
  return reserved;
}
const owned = (coachId: string, id: string) =>
  and(eq(coachSkills.id, id), eq(coachSkills.coachId, coachId));
export async function listCoachSkills(coachId: string): Promise<CoachSkill[]> {
  const rows = await db
    .select()
    .from(coachSkills)
    .where(eq(coachSkills.coachId, coachId))
    .orderBy(asc(coachSkills.name));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
    updatedAt: row.updatedAt.toISOString(),
  }));
}
export async function writeCoachSkill(coachId: string, values: SkillInput) {
  const { id, ...skill } = values;
  if (id) await db.update(coachSkills).set(skill).where(owned(coachId, id));
  else await db.insert(coachSkills).values({ ...skill, coachId });
}
export async function removeCoachSkill(coachId: string, id: string) {
  await db.delete(coachSkills).where(owned(coachId, id));
}
