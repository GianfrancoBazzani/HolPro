import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import * as backend from "../backend/mock";
const input = z.object({
  kind: z.string().min(1).max(80),
  input: z.string().max(4000),
  pollIntervalMs: z.number().nonnegative().default(2000),
});
const state = z.object({
  jobId: z.string(),
  kind: z.string(),
  pollIntervalMs: z.number(),
  done: z.boolean(),
  percent: z.number(),
});
const output = z.object({
  kind: z.string(),
  result: z.string(),
  durationMs: z.number(),
});
const submit = createStep({
  id: "submit",
  inputSchema: input,
  outputSchema: state,
  execute: async ({ inputData }) => ({
    jobId: backend.submit(inputData.kind, inputData.input),
    kind: inputData.kind,
    pollIntervalMs: inputData.pollIntervalMs,
    done: false,
    percent: 0,
  }),
});
const poll = createStep({
  id: "poll",
  inputSchema: state,
  outputSchema: state,
  execute: async ({ inputData, writer }) => {
    const progress = backend.status(inputData.jobId);
    await writer.write({ percent: progress.percent });
    return { ...inputData, ...progress };
  },
});
const pollLoop = createWorkflow({
  id: "poll-loop",
  inputSchema: state,
  outputSchema: state,
})
  .sleep(async ({ inputData }) => inputData.pollIntervalMs)
  .then(poll)
  .commit();
const collect = createStep({
  id: "collect",
  inputSchema: state,
  outputSchema: output,
  execute: async ({ inputData }) => backend.result(inputData.jobId),
});
export const longTask = createWorkflow({
  id: "long-task",
  inputSchema: input,
  outputSchema: output,
  options: { shouldPersistSnapshot: () => true },
})
  .then(submit)
  .dountil(pollLoop, ({ inputData }) => inputData.done)
  .then(collect)
  .commit();
