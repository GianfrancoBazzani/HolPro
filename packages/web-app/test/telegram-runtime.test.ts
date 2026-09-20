import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => {
  const sdk = { initialize: vi.fn(), shutdown: vi.fn() };
  const channels = { initialize: vi.fn(), sdk };
  return { channels, agent: { getChannels: () => channels } };
});
vi.mock("../mastra", () => ({ mastra: {}, getAssistant: () => mocks.agent }));
vi.mock("../lib/telegram/links", () => ({}));
vi.mock("../lib/auth/repository", () => ({}));
vi.mock("../lib/telegram/handlers", () => ({}));
import {
  getTelegramRuntime,
  stopTelegramRuntime,
} from "../lib/telegram/runtime";
afterEach(async () => {
  await stopTelegramRuntime();
  vi.unstubAllEnvs();
});
it("shares initialization, retries a failure, and shuts down the initialized SDK", async () => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test");
  vi.stubEnv("TELEGRAM_BOT_USERNAME", "holpro_bot");
  vi.stubEnv("TELEGRAM_MODE", "webhook");
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET_TOKEN", "secret");
  mocks.channels.initialize.mockRejectedValueOnce(new Error("temporary"));
  const first = getTelegramRuntime();
  expect(getTelegramRuntime()).toBe(first);
  await expect(first).rejects.toThrow("temporary");
  const retry = getTelegramRuntime();
  expect(getTelegramRuntime()).toBe(retry);
  await retry;
  expect(mocks.channels.initialize).toHaveBeenCalledTimes(2);
  expect(mocks.channels.sdk.initialize).toHaveBeenCalledTimes(1);
  await stopTelegramRuntime();
  expect(mocks.channels.sdk.shutdown).toHaveBeenCalledTimes(1);
});
