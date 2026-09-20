import { Memory } from "@mastra/memory";
export const memory = new Memory({
  options: {
    lastMessages: 30,
    workingMemory: {
      enabled: true,
      scope: "resource",
      template:
        "# Coaching profile\n- Goals:\n- Preferences:\n- Current focus:\n- Notes for the next conversation:",
    },
    generateTitle: false,
  },
});
