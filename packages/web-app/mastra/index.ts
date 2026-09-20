import { Mastra } from "@mastra/core/mastra";
import { MySQLStore } from "@mastra/mysql";
import { assistant } from "./agents/assistant";
import { longTask } from "./workflows/long-task";
function createMastra() {
  return new Mastra({
    storage: new MySQLStore({
      id: "holpro",
      connectionString: process.env.DATABASE_URL!,
    }),
    agents: { assistant },
    workflows: { longTask },
    backgroundTasks: {
      enabled: true,
      globalConcurrency: 4,
      perAgentConcurrency: 2,
      backpressure: "queue",
      defaultTimeoutMs: 15 * 60_000,
    },
  });
}
const globalMastra = globalThis as typeof globalThis & {
  holproMastra?: ReturnType<typeof createMastra>;
};
export const mastra = globalMastra.holproMastra ?? createMastra();
if (process.env.NODE_ENV !== "production") globalMastra.holproMastra = mastra;
export const getAssistant = () => mastra.getAgentById("holpro-assistant");
