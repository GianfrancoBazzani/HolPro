import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("../lib/telegram/actions", () => ({
  getTelegramLink: vi.fn(),
  requestTelegramLink: vi.fn(),
  cancelTelegramLink: vi.fn(),
  removeTelegramLink: vi.fn(),
}));
import { TelegramConnection } from "../components/account/telegram-settings";
import { I18nProvider } from "../components/i18n/provider";
import en from "../messages/en.json";
import es from "../messages/es.json";
import itMessages from "../messages/it.json";
import type { LinkView } from "../lib/telegram/state";
const render = (state: LinkView) =>
  renderToStaticMarkup(
    <I18nProvider locale="en" messages={{ settings: en.settings }}>
      <TelegramConnection
        state={state}
        busy={false}
        onConnect={() => {}}
        onCancel={() => {}}
        onDisconnect={() => {}}
      />
    </I18nProvider>,
  );
it("renders both roles without requiring a username", () => {
  for (const role of ["coach", "coachee"] as const) {
    const html = render({
      state: "connected",
      role,
      username: null,
      linkedAt: "2026-09-20T00:00:00Z",
      timezone: "Europe/Malta",
    });
    expect(html).toContain(`your ${role} assistant`);
    expect(html).not.toContain("@null");
    expect(html).toContain("Connected to Telegram");
  }
});
it("offers regeneration when a pending URL cannot be reconstructed", () => {
  const html = render({
    state: "pending",
    id: "l",
    expiresAt: "2030-01-01T00:00:00Z",
    timezone: "UTC",
  });
  expect(html).toContain("Generate new link");
  expect(html).not.toContain("https://t.me");
});
it("never displays expired URLs or disabled controls", () => {
  expect(
    render({
      state: "pending",
      id: "l",
      expiresAt: "2000-01-01T00:00:00Z",
      timezone: "UTC",
      url: "https://t.me/bot?start=old",
    }),
  ).not.toContain("start=old");
  expect(render({ state: "disabled" })).toBe("");
});
it("supplies full role and username variants in all languages", () => {
  for (const messages of [en, es, itMessages]) {
    expect(messages.settings["telegram.connectedNoUsername"]).not.toContain(
      "{username}",
    );
    expect(messages.telegram["linked.coach"]).toContain("{name}");
    expect(messages.telegram["linked.coachee"]).toContain("{name}");
  }
});
