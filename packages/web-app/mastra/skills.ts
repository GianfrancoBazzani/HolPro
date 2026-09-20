import { createSkill, type AgentSkillsResolver } from "@mastra/core/skills";
import { listCoachSkills } from "@/lib/pro/skills-repository";
import { assistantContext } from "./context";
// Coach skills live in MySQL. They load per request as inline skills and merge
// with the read-only workspace skills; the reserved-name rule keeps the sets apart.
export const coachSkillsResolver: AgentSkillsResolver = async ({
  requestContext,
}) => {
  const context = assistantContext(requestContext);
  if (context.role !== "coach") return [];
  const rows = await listCoachSkills(context.userId);
  return rows.map((row) =>
    createSkill({
      name: row.name,
      description: row.description,
      instructions: row.instructions,
    }),
  );
};
