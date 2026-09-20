import { describe, expect, it } from "vitest";
import { issueToken, hashToken, validToken } from "../lib/telegram/tokens";
import { telegramConfig } from "../lib/telegram/config";
describe("Telegram tokens and configuration", () => {
  it("issues unique, hashed 15-minute tokens within the deep-link limit", () => {
    const now = new Date("2026-09-20T00:00:00Z");
    const token = issueToken(now);
    expect(token.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token.hash).toBe(hashToken(token.token));
    expect(token.hash).not.toContain(token.token);
    expect(token.expiresAt.getTime() - now.getTime()).toBe(900_000);
    expect(issueToken(now).token).not.toBe(token.token);
    expect(validToken(token.token)).toBe(true);
    expect(validToken("../bad")).toBe(false);
  });
  it("is off without a token and validates required credentials", () => {
    expect(telegramConfig({})).toBeNull();
    expect(() => telegramConfig({ TELEGRAM_BOT_TOKEN: "x" })).toThrow();
    expect(() =>
      telegramConfig({
        TELEGRAM_BOT_TOKEN: "x",
        TELEGRAM_BOT_USERNAME: "holpro_bot",
      }),
    ).toThrow();
    expect(
      telegramConfig({
        TELEGRAM_BOT_TOKEN: "x",
        TELEGRAM_BOT_USERNAME: "holpro_bot",
        TELEGRAM_MODE: "polling",
      })?.mode,
    ).toBe("polling");
    expect(() =>
      telegramConfig({
        TELEGRAM_BOT_TOKEN: "x",
        TELEGRAM_BOT_USERNAME: "holpro_bot",
        TELEGRAM_MODE: "auto",
      }),
    ).toThrow();
  });
});
