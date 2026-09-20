import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantPanel } from "../components/assistant/assistant-panel";
import { I18nProvider } from "../components/i18n/provider";
import { getDictionary } from "../lib/i18n/dictionary";
import { localeKeys } from "../lib/i18n/config";
for (const locale of localeKeys)
  for (const role of ["coach", "coachee"] as const) {
    it(`renders ${role} greeting and controls in ${locale}`, async () => {
      const messages = await getDictionary(locale),
        onboarding = role === "coachee";
      const html = renderToStaticMarkup(
        <I18nProvider locale={locale} messages={messages}>
          <AssistantPanel name="Alex" role={role} onboarding={onboarding} />
        </I18nProvider>,
      );
      expect(html).toContain(
        messages.assistant[
          onboarding ? "greeting.onboarding" : "greeting.default"
        ].replace("{name}", "Alex"),
      );
      expect(html).toContain(
        messages.assistant.eyebrow,
      );
      expect(html).toContain(
        messages.assistant[onboarding ? "panel.collapse" : "panel.expand"],
      );
    });
  }
it("marks failed and denied long tasks terminal, while deferred output remains running", async () => {
  const { hasRunningTask, MessageList } = await import(
    "../components/assistant/message-list"
  );
  const messages = await getDictionary("en");
  for (const part of [
    {
      type: "tool-startLongTask",
      toolCallId: "call",
      state: "output-denied",
      input: { kind: "review" },
    },
    {
      type: "tool-startLongTask",
      toolCallId: "call",
      state: "output-available",
      input: { kind: "review" },
      output: "Background task failed: job missing",
    },
  ]) {
    const history = [
      { id: "a", role: "assistant", parts: [part] },
    ] as import("ai").UIMessage[];
    expect(hasRunningTask(history)).toBe(false);
    expect(
      renderToStaticMarkup(
        <I18nProvider locale="en" messages={messages}>
          <MessageList messages={history} greeting="" progress={[]} pending={false} />
        </I18nProvider>,
      ),
    ).toContain("Task failed");
  }
  expect(
    hasRunningTask([
      {
        id: "a",
        role: "assistant",
        parts: [
          {
            type: "tool-startLongTask",
            toolCallId: "call",
            state: "output-available",
            input: { kind: "review" },
            output: "Background task started. Task ID: 1.",
          },
        ],
      },
    ]),
  ).toBe(true);
});

it("renders a textarea composer, an icon send button and a plain serif title", async () => {
  const messages = await getDictionary("en");
  const html = renderToStaticMarkup(
    <I18nProvider locale="en" messages={messages}>
      <AssistantPanel name="Alex" role="coachee" onboarding={false} />
    </I18nProvider>,
  );
  expect(html).toContain("<textarea");
  expect(html).not.toContain("<input");
  expect(html).toContain(
    `class="assistant-icon assistant-icon-primary" type="submit"`,
  );
  expect(html).toContain(`aria-label="${messages.assistant["composer.send"]}"`);
  expect(html).toContain(`<h2>${messages.assistant.eyebrow}</h2>`);
});

it("shows a thinking chip while a reply is pending", async () => {
  const { MessageList } = await import(
    "../components/assistant/message-list"
  );
  const messages = await getDictionary("en");
  const html = renderToStaticMarkup(
    <I18nProvider locale="en" messages={messages}>
      <MessageList messages={[]} greeting="Hi" progress={[]} pending />
    </I18nProvider>,
  );
  expect(html).toContain(messages.assistant["status.thinking"]);
});

it("hides the thinking chip when no reply is pending", async () => {
  const { MessageList } = await import("../components/assistant/message-list");
  const messages = await getDictionary("en");
  const html = renderToStaticMarkup(
    <I18nProvider locale="en" messages={messages}>
      <MessageList messages={[]} greeting="Hi" progress={[]} pending={false} />
    </I18nProvider>,
  );
  expect(html).not.toContain(messages.assistant["status.thinking"]);
});
