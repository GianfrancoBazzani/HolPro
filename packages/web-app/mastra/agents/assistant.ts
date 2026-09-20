import {
  publishPlanDocument,
  listPlanDocuments,
  readPlanDocument,
} from "../tools/plan-documents";
import { Agent, type ToolsInput } from "@mastra/core/agent";
import { SkillSearchProcessor } from "@mastra/core/processors";
import {
  assistantContext,
  buildInstructions,
  type AssistantContext,
} from "../context";
import { memory } from "../memory";
import { voice } from "../voice";
import { workspace } from "../workspace";
import { coachSkillsResolver } from "../skills";
import { getMyPlan } from "../tools/get-my-plan";
import { saveOnboardingGoals } from "../tools/save-onboarding-goals";
import { listMyClients } from "../tools/list-my-clients";
import { getClientPlan } from "../tools/get-client-plan";
import { startLongTask } from "../tools/start-long-task";
import { searchCoaches } from "../tools/search-coaches";
function toolsFor(context: AssistantContext): ToolsInput {
  if (context.role === "coach")
    return {
      listMyClients,
      getClientPlan,
      startLongTask,
      publishPlanDocument,
      listPlanDocuments,
      readPlanDocument,
    };
  return {
    getMyPlan,
    saveOnboardingGoals,
    searchCoaches,
    startLongTask,
    listPlanDocuments,
    readPlanDocument,
  };
}
export const assistant = new Agent({
  id: "holpro-assistant",
  name: "HolPro assistant",
  model: process.env.ASSISTANT_MODEL ?? "openai/gpt-5.4-mini",
  instructions: ({ requestContext }) =>
    buildInstructions(assistantContext(requestContext)),
  tools: ({ requestContext }) => toolsFor(assistantContext(requestContext)),
  memory,
  voice,
  workspace,
  skills: coachSkillsResolver,
  inputProcessors: [
    new SkillSearchProcessor({ workspace, search: { topK: 3, minScore: 0.1 } }),
  ],
});
