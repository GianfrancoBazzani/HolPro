import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ link: vi.fn(), user: vi.fn() }));
vi.mock("../lib/telegram/links", () => ({ findUserLink: state.link }));
vi.mock("../lib/auth/repository", () => ({ loadUserWithRoles: state.user }));
import { GuardedTelegramAdapter } from "../lib/telegram/adapter";
import { runScope } from "../lib/telegram/lifecycle";
const generation = {
  id: "old",
  userId: "u",
  chatId: 7,
  role: "coach" as const,
  locale: "en" as const,
};
afterEach(() => vi.unstubAllGlobals());
it("rejects sends from old generations and blocked users before network", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const adapter = new GuardedTelegramAdapter({
    botToken: "test",
    userName: "holpro_bot",
    mode: "webhook",
    secretToken: "secret",
  });
  state.link.mockResolvedValue({
    id: "new",
    role: "coach",
    telegramChatId: 7,
    revokedAt: null,
  });
  state.user.mockResolvedValue({
    status: "active",
    coach: {},
    deletedAt: null,
  });
  await expect(
    runScope(generation, () =>
      adapter.postMessage("telegram:7", "Private result"),
    ),
  ).rejects.toThrow("telegram_delivery_revoked");
  expect(fetch).not.toHaveBeenCalled();
  state.link.mockResolvedValue({
    id: "old",
    role: "coach",
    telegramChatId: 7,
    revokedAt: null,
  });
  state.user.mockResolvedValue({
    status: "suspended",
    coach: {},
    deletedAt: null,
  });
  await expect(
    runScope(generation, () =>
      adapter.postMessage("telegram:7", "Private result"),
    ),
  ).rejects.toThrow("telegram_delivery_revoked");
  expect(fetch).not.toHaveBeenCalled();
});
it("preserves all characters of long plain streamed replies", async () => {
  const sent: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      const payload = JSON.parse(init.body);
      if (!payload.draft_id) sent.push(payload.text);
      return Response.json({
        ok: true,
        result: {
          message_id: sent.length + 1,
          date: 1,
          chat: { id: 7, type: "private" },
          text: payload.text,
        },
      });
    }),
  );
  const adapter = new GuardedTelegramAdapter({
    botToken: "test",
    userName: "holpro_bot",
    mode: "webhook",
    secretToken: "secret",
  });
  const text = "ab😀".repeat(3000);
  await runScope({ system: true, locale: "en" }, () =>
    adapter.stream(
      "telegram:7",
      (async function* () {
        yield text.slice(0, 300);
        yield text.slice(300);
      })(),
    ),
  );
  expect(sent.join("")).toBe(text);
  expect(sent.every((s) => s.length <= 4096)).toBe(true);
});
it("rejects webhook secrets before parsing an update", async () => {
  const adapter = new GuardedTelegramAdapter({
    botToken: "test",
    userName: "holpro_bot",
    mode: "webhook",
    secretToken: "secret",
  });
  for (const secret of ["", "wrong"]) {
    const response = await adapter.handleWebhook(
      new Request("http://localhost", {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": secret },
        body: "{}",
      }),
    );
    expect(response.status).toBe(401);
  }
});
