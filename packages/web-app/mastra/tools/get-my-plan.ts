import { planSchema } from "./schemas";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { loadCalendar } from "@/lib/calendar/repository";
import { requireRole } from "./context";
export const getMyPlan = createTool({
  id: "getMyPlan",
  description: "Read the current coachee's plan, periods and checkpoints.",
  outputSchema: planSchema,
  inputSchema: z.object({}),
  execute: async (_, { requestContext }) => {
    const { userId } = requireRole(requestContext, "coachee");
    const { engagements, items } = await loadCalendar(userId);
    return { engagements, items };
  },
});
