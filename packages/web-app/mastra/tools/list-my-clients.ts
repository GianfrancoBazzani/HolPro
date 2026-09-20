import { clientSchema, toClientSummary } from "./schemas";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { loadClients } from "@/lib/pro/repository";
import { requireRole } from "./context";
export const listMyClients = createTool({
  id: "listMyClients",
  description: "List the current coach's active clients.",
  outputSchema: z.object({ clients: z.array(clientSchema) }),
  inputSchema: z.object({}),
  execute: async (_, { requestContext }) => {
    const { userId } = requireRole(requestContext, "coach");
    return { clients: (await loadClients(userId)).map(toClientSummary) };
  },
});
