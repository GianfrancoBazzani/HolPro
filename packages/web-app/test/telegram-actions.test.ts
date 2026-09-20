import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  session: vi.fn(),
  user: vi.fn(),
  link: vi.fn(),
  issue: vi.fn(),
  cancel: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../lib/auth/server", () => ({
  auth: { api: { getSession: mock.session } },
}));
vi.mock("../lib/auth/repository", () => ({ loadUserWithRoles: mock.user }));
vi.mock("../lib/telegram/links", () => ({
  findUserLink: mock.link,
  requestLink: mock.issue,
  cancelLink: mock.cancel,
}));
vi.mock("../lib/telegram/runtime", () => ({ removeLink: mock.remove }));
import {
  getTelegramLink,
  requestTelegramLink,
  cancelTelegramLink,
} from "../lib/telegram/actions";
beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test");
  vi.stubEnv("TELEGRAM_BOT_USERNAME", "holpro_bot");
  vi.stubEnv("TELEGRAM_MODE", "polling");
  mock.session.mockResolvedValue({ user: { id: "u" } });
  mock.user.mockResolvedValue({
    id: "u",
    status: "active",
    deletedAt: null,
    coachee: {},
    coach: null,
    timezone: "Europe/Malta",
  });
  mock.link.mockResolvedValue(undefined);
  vi.clearAllMocks();
});
it("rejects unauthenticated access and forged portal membership", async () => {
  expect(await requestTelegramLink("coach")).toEqual({
    error: "telegram.error",
  });
  expect(mock.issue).not.toHaveBeenCalled();
  mock.session.mockResolvedValue(null);
  expect(await getTelegramLink()).toEqual({ error: "telegram.error" });
});
it("redacts hashes and cannot reconstruct a pending deep link", async () => {
  mock.link.mockResolvedValue({
    id: "l",
    role: "coachee",
    tokenHash: "secret-hash",
    tokenExpiresAt: new Date("2030-01-01"),
    linkedAt: null,
    revokedAt: null,
  });
  const result = await getTelegramLink();
  expect(result).toMatchObject({ state: "pending", id: "l" });
  expect(JSON.stringify(result)).not.toMatch(/secret-hash|https:/);
});
it("scopes cancellation to the authenticated user and supplied generation", async () => {
  await cancelTelegramLink("old-link");
  expect(mock.cancel).toHaveBeenCalledWith("u", "old-link");
});
