import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { saveCoacheeGoals } from "@/lib/assistant/goals";
import { requireRole } from "./context";
export const saveOnboardingGoals = createTool({
  id: "saveOnboardingGoals",
  description: "Save the coachee's confirmed goals for their coach.",
  inputSchema: z.object({
    goals: z.string().trim().min(1).max(4000),
    summary: z.string().trim().min(1).max(280),
  }),
  outputSchema: z.object({ saved: z.literal(true) }),
  execute: async ({ goals, summary }, { requestContext }) => {
    const { userId } = requireRole(requestContext, "coachee");
    await saveCoacheeGoals(userId, goals, summary);
    return { saved: true as const };
  },
});
