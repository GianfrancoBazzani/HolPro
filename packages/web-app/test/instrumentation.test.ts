import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("../lib/mcp/secret", () => ({ mcpSecret: vi.fn() }));
vi.mock("../lib/telegram/runtime", () => ({
  getTelegramRuntime: vi.fn(async () => ({})),
  stopTelegramRuntime: vi.fn(async () => {}),
}));
import { register } from "../instrumentation";
import { mcpSecret } from "../lib/mcp/secret";
import { getTelegramRuntime, stopTelegramRuntime } from "../lib/telegram/runtime";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PHASE", "phase-production-server");
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  vi.stubEnv("TELEGRAM_MODE", "polling");
  // Never install or emit real process shutdown handlers in the test runner.
  vi.spyOn(process, "once").mockReturnValue(process);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it("does not initialize Node services or signal handlers in the Edge runtime", async () => {
  vi.stubEnv("NEXT_RUNTIME", "edge");
  await register();
  expect(mcpSecret).not.toHaveBeenCalled();
  expect(getTelegramRuntime).not.toHaveBeenCalled();
  expect(process.once).not.toHaveBeenCalled();
});
it.each([
  ["NEXT_PHASE", "phase-production-build"],
  ["TELEGRAM_MODE", "webhook"],
  ["TELEGRAM_BOT_TOKEN", ""],
])("validates the production secret but skips polling for %s=%s", async (name, value) => {
  vi.stubEnv(name, value);
  await register();
  expect(mcpSecret).toHaveBeenCalledOnce();
  expect(getTelegramRuntime).not.toHaveBeenCalled();
  expect(process.once).not.toHaveBeenCalled();
});
it("starts Node polling and registers graceful shutdown for both signals", async () => {
  await register();
  expect(mcpSecret).toHaveBeenCalledOnce();
  expect(getTelegramRuntime).toHaveBeenCalledOnce();
  const calls = vi.mocked(process.once).mock.calls;
  expect(calls.map(([signal]) => signal)).toEqual(["SIGTERM", "SIGINT"]);
  for (const [, stop] of calls) stop();
  expect(stopTelegramRuntime).toHaveBeenCalledTimes(2);
});
it("fails startup when the production MCP secret is invalid", async () => {
  vi.mocked(mcpSecret).mockImplementationOnce(() => { throw new Error("invalid secret"); });
  await expect(register()).rejects.toThrow("invalid secret");
  expect(getTelegramRuntime).not.toHaveBeenCalled();
});
