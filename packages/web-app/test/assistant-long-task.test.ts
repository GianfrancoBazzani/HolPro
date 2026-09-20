import { expect, it, vi } from "vitest";
import { longTask } from "../mastra/workflows/long-task";
it("completes a zero-duration job through the real workflow", async () => {
  vi.stubEnv("MOCK_TASK_DURATION_MS", "0");
  try {
    const run = await longTask.createRun({ resourceId: "u" });
    const completed = await run.start({
      inputData: { kind: "review", input: "Focus", pollIntervalMs: 0 },
    });
    expect(completed.status).toBe("success");
    if (completed.status === "success")
      expect(completed.result).toMatchObject({
        kind: "review",
        result: expect.stringContaining("Focus"),
      });
  } finally {
    vi.unstubAllEnvs();
  }
});
it("exposes percent from nested workflow step output", async () => {
  vi.stubEnv("MOCK_TASK_DURATION_MS", "0");
  const { progressPercent } = await import("../mastra/backend/registry");
  const run = await longTask.createRun({ resourceId: "progress-user" });
  const output = run.stream({
    inputData: { kind: "review", input: "Focus", pollIntervalMs: 0 },
  });
  const reader = run.observeStream().getReader(),
    percentages: number[] = [];
  const observed = (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const percent = progressPercent(value);
      if (percent !== undefined) percentages.push(percent);
    }
  })();
  try {
    await output.result;
    await observed;
    expect(percentages).toContain(100);
  } finally {
    vi.unstubAllEnvs();
  }
});
it("registers a running tool for its owner and removes it after completion", async () => {
  const { startLongTask } = await import("../mastra/tools/start-long-task");
  const { activeRuns } = await import("../mastra/backend/registry");
  const { toRequestContext } = await import("../mastra/context");
  const { noopObserve } = await import("@mastra/core/tools");
  vi.stubEnv("MOCK_TASK_DURATION_MS", "0");
  try {
    const pending = startLongTask.execute!(
      { kind: "review", input: "Focus" },
      {
        observe: noopObserve,
        requestContext: toRequestContext({
          userId: "registry-owner",
          name: "Alex",
          role: "coachee",
          locale: "en",
          timezone: "UTC",
          onboarding: false,
          goalsSaved: false,
        }),
      },
    );
    await vi.waitFor(() =>
      expect(activeRuns("registry-owner")).toHaveLength(1),
    );
    expect(activeRuns("someone-else")).toEqual([]);
    expect(await pending).toMatchObject({
      kind: "review",
      status: "done",
      result: "review: Focus",
    });
    expect(activeRuns("registry-owner")).toEqual([]);
  } finally {
    vi.unstubAllEnvs();
  }
});
it("cancels its workflow and clears registration when the background timeout aborts", async () => {
  const { startLongTask } = await import("../mastra/tools/start-long-task");
  const { activeRuns } = await import("../mastra/backend/registry");
  const { toRequestContext } = await import("../mastra/context");
  const { noopObserve } = await import("@mastra/core/tools");
  vi.stubEnv("MOCK_TASK_DURATION_MS", "0");
  const controller = new AbortController();
  try {
    const pending = startLongTask.execute!(
      { kind: "review", input: "Focus" },
      {
        observe: noopObserve,
        abortSignal: controller.signal,
        requestContext: toRequestContext({
          userId: "timed-out-owner",
          name: "Alex",
          role: "coachee",
          locale: "en",
          timezone: "UTC",
          onboarding: false,
          goalsSaved: false,
        }),
      },
    );
    await vi.waitFor(() =>
      expect(activeRuns("timed-out-owner")).toHaveLength(1),
    );
    controller.abort();
    await expect(pending).rejects.toThrow("assistant_task_failed");
    expect(activeRuns("timed-out-owner")).toEqual([]);
  } finally {
    vi.unstubAllEnvs();
  }
});
