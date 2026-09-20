import { Memory } from "@mastra/memory";
import { titleInstructions } from "./context";
export const memory = new Memory({
  options: {
    lastMessages: 30,
    workingMemory: {
      enabled: true,
      scope: "resource",
      template:
        "# Coaching profile\n- Goals:\n- Preferences:\n- Current focus:\n- Notes for the next conversation:",
    },
    generateTitle: {
      model: process.env.ASSISTANT_TITLE_MODEL ?? "openai/gpt-5.4-mini",
      instructions: ({ requestContext }) => titleInstructions(requestContext),
    },
  },
});
