import { afterEach, expect, it, vi } from "vitest";
import { submit, status, result } from "../mastra/backend/mock";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
it("progresses to completion and returns the submitted input", () => {
  vi.useFakeTimers();
  vi.stubEnv("MOCK_TASK_DURATION_MS", "2000");
  const id = submit("review", "Focus");
  expect(status(id)).toEqual({ done: false, percent: 0 });
  vi.advanceTimersByTime(1000);
  expect(status(id)).toEqual({ done: false, percent: 50 });
  vi.advanceTimersByTime(1000);
  expect(status(id)).toEqual({ done: true, percent: 100 });
  expect(result(id)).toMatchObject({ kind: "review", durationMs: 2000 });
  expect(result(id).result).toContain("Focus");
});
it("rejects unknown jobs", () => {
  expect(() => status("missing")).toThrow("Unknown");
});
