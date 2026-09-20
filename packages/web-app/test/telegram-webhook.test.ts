import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ initialize: vi.fn(), forward: vi.fn() }));
vi.mock("../lib/telegram/runtime", () => ({
  getTelegramRuntime: mocks.initialize,
}));
import { POST } from "../app/api/telegram/webhook/route";
beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test");
  vi.stubEnv("TELEGRAM_BOT_USERNAME", "holpro_bot");
  vi.stubEnv("TELEGRAM_MODE", "webhook");
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET_TOKEN", "secret");
  mocks.initialize.mockResolvedValue({
    channels: { handleWebhookEvent: mocks.forward },
  });
  mocks.forward.mockResolvedValue(new Response(null, { status: 200 }));
  vi.clearAllMocks();
});
it("returns 404 without initializing when disabled or polling", async () => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
  expect((await POST(new Request("http://localhost"))).status).toBe(404);
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test");
  vi.stubEnv("TELEGRAM_MODE", "polling");
  expect((await POST(new Request("http://localhost"))).status).toBe(404);
  expect(mocks.initialize).not.toHaveBeenCalled();
});
it("forwards the original request only after initialization", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    body: "{}",
  });
  expect((await POST(request)).status).toBe(200);
  expect(mocks.forward).toHaveBeenCalledWith("telegram", request);
});
it("returns retryable 503 on failed startup", async () => {
  mocks.initialize.mockRejectedValue(new Error("startup"));
  expect((await POST(new Request("http://localhost"))).status).toBe(503);
  expect(mocks.forward).not.toHaveBeenCalled();
});
