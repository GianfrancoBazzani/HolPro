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
          <AssistantPanel
            name="Alex"
            role={role}
            onboarding={onboarding}
            timezone="UTC"
          />
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
      <AssistantPanel
        name="Alex"
        role="coachee"
        onboarding={false}
        timezone="UTC"
      />
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

const listProps = {
  timezone: "UTC",
  confirming: null,
  busy: false,
  onSelect: () => {},
  onAskDelete: () => {},
  onConfirmDelete: () => {},
  onCancelDelete: () => {},
};
it("renders the conversation rows with a current marker, dates, fallbacks and the confirmation", async () => {
  const { ConversationList } = await import(
    "../components/assistant/conversation-menu"
  );
  const messages = await getDictionary("en");
  const conversations = [
    { id: "coachee:u:a", title: "Sleep routine", updatedAt: "2026-09-20T10:00:00.000Z" },
    { id: "coachee:u", title: null, updatedAt: "2026-09-19T10:00:00.000Z" },
  ];
  const html = renderToStaticMarkup(
    <I18nProvider locale="en" messages={messages}>
      <ConversationList
        {...listProps}
        conversations={conversations}
        activeId="coachee:u:a"
        timezone="Europe/Rome"
        confirming="coachee:u"
      />
    </I18nProvider>,
  );
  expect(html).toContain('aria-current="true"');
  expect(html).toContain("assistant-conversation-check");
  expect(html).toContain(messages.assistant["conversation.current"]);
  expect(html).toContain("Sleep routine");
  expect(html).toContain(
    new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Rome",
    }).format(new Date("2026-09-20T10:00:00.000Z")),
  );
  expect(html).toContain(messages.assistant["conversation.deleteQuestion"]);
  expect(html).toContain(messages.assistant["conversation.deleteConfirm"]);
  expect(html).toContain(messages.assistant["conversation.deleteCancel"]);
  expect(html).not.toContain(messages.assistant["conversation.untitled"]);
  const empty = renderToStaticMarkup(
    <I18nProvider locale="en" messages={messages}>
      <ConversationList {...listProps} conversations={[]} activeId={null} />
    </I18nProvider>,
  );
  expect(empty).toContain(messages.assistant["conversation.empty"]);
  const untitled = renderToStaticMarkup(
    <I18nProvider locale="en" messages={messages}>
      <ConversationList
        {...listProps}
        conversations={[conversations[1]]}
        activeId={null}
      />
    </I18nProvider>,
  );
  expect(untitled).toContain(messages.assistant["conversation.untitled"]);
  expect(untitled).toContain(
    `aria-label="${messages.assistant["conversation.delete"]}"`,
  );
  expect(untitled).not.toContain("aria-current");
});
it("renders the plus and history buttons in the header before the collapse button", async () => {
  const messages = await getDictionary("en");
  const html = renderToStaticMarkup(
    <I18nProvider locale="en" messages={messages}>
      <AssistantPanel
        name="Alex"
        role="coachee"
        onboarding={false}
        timezone="UTC"
      />
    </I18nProvider>,
  );
  const plus = html.indexOf(
      `aria-label="${messages.assistant["conversation.new"]}"`,
    ),
    history = html.indexOf(
      `aria-label="${messages.assistant["conversation.history"]}"`,
    ),
    collapse = html.indexOf(`aria-label="${messages.assistant["panel.expand"]}"`);
  expect(plus).toBeGreaterThan(-1);
  expect(history).toBeGreaterThan(plus);
  expect(collapse).toBeGreaterThan(history);
  expect(html).toContain('aria-haspopup="true"');
  expect(html).toContain('aria-expanded="false"');
  expect(html).not.toContain("assistant-conversation-list");
});
