import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { assistantContext } from "../context";
import { longTask } from "../workflows/long-task";
import {
  registerRun,
  progressPercent,
  type ActiveRun,
} from "../backend/registry";
export const startLongTask = createTool({
  id: "startLongTask",
  description:
    "Start a mock backend task that takes about two minutes. It continues in the background.",
  inputSchema: z.object({
    kind: z.string().trim().min(1).max(80),
    input: z.string().max(4000),
  }),
  outputSchema: z.object({
    kind: z.string(),
    status: z.literal("done"),
    result: z.string(),
    durationMs: z.number(),
  }),
  background: {
    enabled: true,
    defaultDisposition: "deferred",
    timeoutMs: 15 * 60_000,
  },
  execute: async ({ kind, input }, { requestContext, abortSignal }) => {
    const { userId } = assistantContext(requestContext);
    if (abortSignal?.aborted) throw new Error("assistant_task_failed");
    const run = await longTask.createRun({ resourceId: userId });
    const registration: ActiveRun = { runId: run.runId, kind, percent: 0 };
    const unregister = registerRun(userId, registration);
    try {
      const output = run.stream({
        inputData: { kind, input, pollIntervalMs: 2000 },
      });
      const reader = run.observeStream().getReader();
      const monitor = (async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const percent = progressPercent(value);
            if (percent !== undefined) registration.percent = percent;
          }
        } catch {
          /* The result below is authoritative. */
        }
      })();
      const cancel = () => {
        void run.cancel().catch(() => {});
      };
      abortSignal?.addEventListener("abort", cancel, { once: true });
      if (abortSignal?.aborted) cancel();
      try {
        const completed = await output.result;
        if (completed.status !== "success")
          throw new Error("assistant_task_failed");
        return { ...completed.result, status: "done" as const };
      } finally {
        abortSignal?.removeEventListener("abort", cancel);
        await reader.cancel().catch(() => {});
        await monitor;
      }
    } finally {
      unregister();
    }
  },
});
