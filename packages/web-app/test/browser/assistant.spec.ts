import { test, expect, type Page } from "@playwright/test";
const streamHeaders = {
  "content-type": "text/event-stream",
  "x-vercel-ai-ui-message-stream": "v1",
};
function reply(text: string) {
  return (
    [
      { type: "start", messageId: crypto.randomUUID() },
      { type: "text-start", id: "text-1" },
      { type: "text-delta", id: "text-1", delta: text },
      { type: "text-end", id: "text-1" },
      { type: "finish" },
    ]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join("") + "data: [DONE]\n\n"
  );
}
async function history(page: Page, messages: unknown[] = []) {
  await page.route("**/api/assistant/threads?*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/assistant/chat?*", async (route) => {
    expect(new URL(route.request().url()).searchParams.get("portal")).toBe("coachee");
    if (route.request().method() === "GET")
      await route.fulfill({ json: messages });
    else
      await route.fulfill({
        headers: streamHeaders,
        body: reply("Your goals are saved."),
      });
  });
}
test("onboarding expands, collapse persists, and only the latest user text is sent", async ({
  page,
}) => {
  await history(page);
  await page.goto("/?assistant=1");
  await expect(
    page.getByText("Hello Alex. Tell me more about your goals."),
  ).toBeVisible();
  await expect(page.locator(".dashboard-main")).toBeHidden();
  await page.getByRole("button", { name: "Collapse assistant" }).click();
  await expect(page.locator(".dashboard-main")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expand assistant" }),
  ).toBeVisible();
  const sent = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname === "/api/assistant/chat" &&
      request.method() === "POST",
  );
  await page
    .getByRole("textbox", { name: "Write a message" })
    .fill("Improve focus");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const body = (await sent).postDataJSON();
  expect(body.messages).toHaveLength(1);
  expect(body.messages[0].role).toBe("user");
  expect(body.messages[0].parts).toEqual([
    { type: "text", text: "Improve focus" },
  ]);
  await expect(page.getByText("Your goals are saved.")).toBeVisible();
});
test("history loads before sending and historical replies stay silent", async ({
  page,
}) => {
  await history(page, [
    {
      id: "old",
      role: "assistant",
      parts: [{ type: "text", text: "Previously saved goals" }],
    },
  ]);
  let calls = 0;
  await page.route("**/api/assistant/speak?*", (route) => {
    calls++;
    return route.fulfill({ body: "audio" });
  });
  await page.goto("/?assistant=1");
  await expect(page.getByText("Previously saved goals")).toBeVisible();
  await page.getByRole("button", { name: "Turn voice on" }).click();
  expect(calls).toBe(0);
});
test("microphone denial displays translated feedback", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        throw new Error("denied");
      },
    });
  });
  await history(page);
  await page.goto("/?assistant=1");
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Could not record audio.",
  );
});
test("records on click, sends the transcript and releases microphone tracks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { tracksStopped?: boolean };
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => ({
        getTracks: () => [
          {
            stop: () => {
              state.tracksStopped = true;
            },
          },
        ],
      }),
    });
    class Recorder {
      static isTypeSupported() {
        return true;
      }
      state = "inactive";
      ondataavailable?: (event: { data: Blob }) => void;
      onstop?: () => void;
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["test audio"]) });
        this.onstop?.();
      }
    }
    Object.defineProperty(window, "MediaRecorder", { value: Recorder });
  });
  await history(page);
  await page.route("**/api/assistant/transcribe?*", (route) =>
    route.fulfill({ json: { text: "My goal is focus" } }),
  );
  await page.goto("/?assistant=1");
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(
    page.getByText("My goal is focus", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { tracksStopped?: boolean }).tracksStopped,
    ),
  ).toBe(true);
});
test("failed chat can be retried", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/assistant/threads?*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/assistant/chat?*", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: [] });
    posts++;
    return posts === 1
      ? route.fulfill({ status: 500, json: { error: "assistant_error" } })
      : route.fulfill({
          headers: streamHeaders,
          body: reply("Recovered reply"),
        });
  });
  await page.goto("/?assistant=1");
  await page.getByRole("textbox").fill("Help me");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Recovered reply")).toBeVisible();
});
for (const locale of ["en", "es", "it"])
  test(`assistant fits a narrow screen in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await history(page);
    await page.goto(`/?assistant=1&locale=${locale}`);
    await expect(page.locator(".assistant-panel")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
test("history failure retries hydration without creating an empty chat turn", async ({
  page,
}) => {
  let recover = false,
    posts = 0;
  await page.route("**/api/assistant/chat?*", (route) => {
    if (route.request().method() === "POST") {
      posts++;
      return route.fulfill({ status: 400 });
    }
    return !recover
      ? route.fulfill({ status: 500 })
      : route.fulfill({
          json: [
            {
              id: "restored",
              role: "assistant",
              parts: [{ type: "text", text: "Restored history" }],
            },
          ],
        });
  });
  await page.goto("/?assistant=1");
  await expect(page.getByRole("alert")).toBeVisible();
  recover = true;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Restored history")).toBeVisible();
  expect(posts).toBe(0);
});
test("reconciles completed tasks after reopening while allowing memory to catch up", async ({
  page,
}) => {
  let completedAt = Infinity;
  const pending = {
    id: "task-reply",
    role: "assistant",
    parts: [
      {
        type: "tool-startLongTask",
        toolCallId: "call-1",
        state: "input-available",
        input: { kind: "review", input: "Focus" },
      },
    ],
  };
  await page.route("**/api/assistant/chat?*", (route) => {
    const done = Date.now() >= completedAt;
    return route.fulfill({
      json: [
        {
          ...pending,
          parts: done
            ? [
                {
                  ...pending.parts[0],
                  state: "output-available",
                  output: {
                    kind: "review",
                    status: "done",
                    result: "Completed review",
                    durationMs: 120000,
                  },
                },
              ]
            : pending.parts,
        },
      ],
    });
  });
  await page.route("**/api/assistant/tasks?*", (route) => {
    if (completedAt === Infinity) completedAt = Date.now() + 700;
    return route.fulfill({
      headers: { "content-type": "text/event-stream" },
      body: 'event: progress\ndata: {"runId":"r","kind":"review","percent":100}\n\nevent: done\ndata: {"runId":"r","kind":"review"}\n\n',
    });
  });
  await page.goto("/?assistant=1");
  await expect(
    page.getByText("Task done: review", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Task running: review", { exact: true }),
  ).toHaveCount(0);
});
test("speaks completed replies and stops playback when a new user turn starts", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as typeof window & {
      played?: number;
      paused?: number;
    };
    class Player {
      onended?: () => void;
      onerror?: () => void;
      play() {
        state.played = (state.played ?? 0) + 1;
        return Promise.resolve();
      }
      pause() {
        state.paused = (state.paused ?? 0) + 1;
      }
    }
    Object.defineProperty(window, "Audio", { value: Player });
  });
  await history(page);
  const spoken: string[] = [];
  await page.route("**/api/assistant/speak?*", (route) => {
    spoken.push(route.request().postDataJSON().text);
    return route.fulfill({ contentType: "audio/mpeg", body: "audio" });
  });
  await page.goto("/?assistant=1");
  await page.getByRole("button", { name: "Turn voice on" }).click();
  await page.getByRole("textbox").fill("Help me focus");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { played?: number }).played,
      ),
    )
    .toBe(1);
  expect(spoken).toEqual(["Your goals are saved."]);
  await page.getByRole("textbox").fill("Another question");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { paused?: number }).paused,
      ),
    )
    .toBe(1);
});

test("retrying failed speech preserves the completed chat and retries only audio", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/assistant/threads?*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/assistant/chat?*", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: [] });
    posts++;
    return route.fulfill({ headers: streamHeaders, body: reply("Plan published.") });
  });
  const spoken: string[] = [];
  await page.route("**/api/assistant/speak?*", (route) => {
    spoken.push(route.request().postDataJSON().text);
    return route.fulfill({ status: 500 });
  });
  await page.goto("/?assistant=1");
  await page.getByRole("button", { name: "Turn voice on" }).click();
  await page.getByRole("textbox").fill("Publish my plan");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect.poll(() => spoken.length).toBe(2);
  expect(posts).toBe(1);
  expect(spoken).toEqual(["Plan published.", "Plan published."]);
  await expect(page.getByText("Plan published.", { exact: true })).toBeVisible();
});

test("microphone failure after a completed turn cannot regenerate that turn", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => { throw new Error("denied"); },
    });
  });
  await history(page, [
    { id: "user", role: "user", parts: [{ type: "text", text: "Publish my plan" }] },
    { id: "assistant", role: "assistant", parts: [{ type: "text", text: "Plan published." }] },
  ]);
  await page.goto("/?assistant=1");
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert").getByRole("button", { name: "Try again" })).toHaveCount(0);
  await expect(page.getByText("Plan published.", { exact: true })).toBeVisible();
});

test("composer sizes, keyboard input, pending state and Markdown presentation", async ({ page }) => {
  let finish: (() => void) | undefined;
  await page.route("**/api/assistant/chat?*", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: [] });
    await new Promise<void>((resolve) => { finish = resolve; });
    await route.fulfill({ headers: streamHeaders, body: reply("**Bold**\n\n- First\n- Second\n\n```js\nconst total = 1;\n```\n\n| A | B |\n|---|---|\n| One | Two |") });
  });
  await page.goto("/?assistant=1");
  const field = page.getByRole("textbox", { name: "Write a message" });
  await expect(field).toBeEnabled();
  expect(await field.evaluate((node) => node.tagName)).toBe("TEXTAREA");
  expect((await field.boundingBox())?.height).toBe(44);
  await field.fill("First");
  await field.press("Shift+Enter");
  await field.press("a");
  await expect(field).toHaveValue("First\na");
  expect((await field.boundingBox())!.height).toBeGreaterThan(44);
  await field.fill(Array(9).fill("line").join("\n"));
  expect((await field.boundingBox())?.height).toBe(144);
  await field.fill("My **literal** question");
  await field.dispatchEvent("keydown", { key: "Enter", isComposing: true });
  await expect(field).toHaveValue("My **literal** question");
  await field.focus();
  expect(await field.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
  await field.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Thinking…");
  await expect(field).toBeDisabled();
  finish!();
  await expect(page.getByText("Thinking…", { exact: true })).toHaveCount(0);
  await expect(page.locator(".assistant-message-assistant strong")).toHaveText("Bold");
  await expect(page.locator(".assistant-message-assistant li")).toHaveCount(2);
  await expect(page.locator(".hljs-keyword")).toHaveText("const");
  await expect(page.locator(".assistant-table table")).toBeVisible();
  const bubble = page.locator(".assistant-message-user");
  expect((await bubble.boundingBox())!.width).toBeLessThanOrEqual(520);
  expect(await bubble.evaluate((node) => getComputedStyle(node).borderTopWidth)).toBe("0px");
  await page.screenshot({ path: "/tmp/holpro-chat-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/holpro-chat-mobile.png", fullPage: true });
});

test("Markdown lists retain markers and wide content stays inside the log", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await history(page, [{ id: "wide", role: "assistant", parts: [{ type: "text", text: "- One\n- Two\n\n1. First\n2. Second\n\n```text\n" + "wide ".repeat(100) + "\n```\n\n| " + Array(12).fill("Column").join(" | ") + " |\n| " + Array(12).fill("---").join(" | ") + " |\n| " + Array(12).fill("content").join(" | ") + " |" }] }]);
  await page.goto("/?assistant=1");
  const list = page.locator(".assistant-markdown ul");
  await expect(list).toBeVisible();
  expect(await list.evaluate((node) => getComputedStyle(node).listStyleType)).toBe("disc");
  expect(await page.locator(".assistant-markdown ol").evaluate((node) => getComputedStyle(node).listStyleType)).toBe("decimal");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator(".assistant-messages").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(await page.locator(".assistant-markdown pre").evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
});

test("textarea fallback grows and shrinks without native field sizing", async ({ page }) => {
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = ((property: string, value?: string) => property === "field-sizing" ? false : value === undefined ? supports(property) : supports(property, value)) as typeof CSS.supports;
  });
  await history(page);
  await page.goto("/?assistant=1");
  await page.addStyleTag({ content: ".assistant-field { field-sizing: fixed; }" });
  const field = page.getByRole("textbox");
  await expect(field).toBeEnabled();
  await field.fill(Array(9).fill("line").join("\n"));
  await expect.poll(async () => (await field.boundingBox())?.height).toBe(144);
  await field.fill("short");
  await expect.poll(async () => (await field.boundingBox())?.height).toBe(44);
});

test("log initially follows history, preserves reading position, and follows a new turn", async ({ page }) => {
  let finish: (() => void) | undefined;
  await page.route("**/api/assistant/chat?*", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: Array.from({ length: 30 }, (_, i) => ({ id: `history-${i}`, role: "assistant", parts: [{ type: "text", text: `Earlier message ${i}` }] })) });
    await new Promise<void>((resolve) => { finish = resolve; });
    await route.fulfill({ headers: streamHeaders, body: reply("A new reply") });
  });
  await page.goto("/?assistant=1");
  const log = page.getByRole("log");
  await expect(page.getByText("Earlier message 29", { exact: true })).toBeVisible();
  const remaining = () => log.evaluate((node) => node.scrollHeight - node.scrollTop - node.clientHeight);
  await expect.poll(remaining).toBeLessThan(2);
  await page.getByRole("textbox").fill("Question");
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByText("Thinking…", { exact: true })).toBeVisible();
  await log.evaluate((node) => { node.scrollTop = 0; node.dispatchEvent(new Event("scroll")); });
  finish!();
  await expect(page.getByText("Thinking…", { exact: true })).toHaveCount(0);
  expect(await log.evaluate((node) => node.scrollTop)).toBe(0);
  await page.getByRole("textbox").fill("Follow-up");
  await page.getByRole("textbox").press("Enter");
  await expect.poll(remaining).toBeLessThan(2);
  finish!();
});

test("composer controls keep one row in a narrow panel", async ({ page }) => {
  await page.addInitScript(() => {
    class Recorder {
      static isTypeSupported() {
        return true;
      }
      state = "inactive";
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
      }
    }
    Object.defineProperty(window, "MediaRecorder", { value: Recorder });
  });
  await history(page);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/?assistant=1");
  const buttons = page.locator(".assistant-actions .assistant-icon");
  await expect(buttons).toHaveCount(3);
  const boxes = await buttons.evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect()),
  );
  const field = await page.locator(".assistant-field").evaluate((node) =>
    node.getBoundingClientRect(),
  );
  // The three controls share one row, keep an even gap and end at the
  // field edge, so a narrow panel never moves a single button on its own.
  expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(1);
  expect(Math.round(boxes[1].left - boxes[0].right)).toBe(12);
  expect(Math.round(boxes[2].left - boxes[1].right)).toBe(12);
  expect(Math.round(boxes[2].right)).toBe(Math.round(field.right));
  expect(boxes[0].left).toBeGreaterThan(field.left);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
type Row = { id: string; title: string | null; updatedAt: string };
test("a new conversation clears a failed chat and its unsent draft", async ({ page }) => {
  await threads(page, []);
  await page.route("**/api/assistant/chat?*", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: [] })
      : route.fulfill({ status: 500, json: { error: "assistant_error" } }),
  );
  await page.goto("/?assistant=1");
  const field = page.getByRole("textbox", { name: "Write a message" });
  await field.fill("Help me");
  await field.press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();
  await field.fill("Draft for the old conversation");
  await page.getByRole("button", { name: "Start a new conversation" }).click();
  await expect(page.getByText("Help me", { exact: true })).toBeHidden();
  await expect(field).toBeEnabled();
  await expect(page.getByRole("alert")).toBeHidden();
  await expect(field).toHaveValue("");
  await expect(field).toBeFocused();
});
async function threads(page: Page, list: Row[]) {
  const state = { list, created: 0, deleted: [] as string[] };
  await page.route("**/api/assistant/threads?*", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("portal")).toBe("coachee");
    const method = route.request().method();
    if (method === "GET") return route.fulfill({ json: state.list });
    if (method === "POST") {
      state.created++;
      const id = `coachee:u:new-${state.created}`;
      state.list = [
        { id, title: null, updatedAt: "2026-09-20T12:00:00.000Z" },
        ...state.list,
      ];
      return route.fulfill({ status: 201, json: { id } });
    }
    const thread = url.searchParams.get("thread")!;
    state.deleted.push(thread);
    state.list = state.list.filter((c) => c.id !== thread);
    return route.fulfill({ status: 204 });
  });
  return state;
}
test("lists conversations, switches, creates and deletes with a confirmation", async ({
  page,
}) => {
  const histories: Record<string, unknown[]> = {
    "coachee:u:a": [
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "Sleep plan" }] },
    ],
    "coachee:u": [
      { id: "b1", role: "assistant", parts: [{ type: "text", text: "First chat" }] },
    ],
  };
  await page.route("**/api/assistant/chat?*", async (route) => {
    const url = new URL(route.request().url());
    const thread = url.searchParams.get("thread") ?? "coachee:u:a";
    if (route.request().method() === "GET")
      return route.fulfill({
        json: histories[thread] ?? [],
        headers: { "x-assistant-thread": thread },
      });
    return route.fulfill({ headers: streamHeaders, body: reply("Reply") });
  });
  const state = await threads(page, [
    { id: "coachee:u:a", title: "Sleep routine", updatedAt: "2026-09-20T10:00:00.000Z" },
    { id: "coachee:u", title: null, updatedAt: "2026-09-19T10:00:00.000Z" },
  ]);
  await page.goto("/?assistant=1");
  await expect(page.getByText("Sleep plan")).toBeVisible();
  const history = page.getByRole("button", { name: "Open past conversations" });
  await history.click();
  await expect(history).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: /Sleep routine/ }),
  ).toHaveAttribute("aria-current", "true");
  await page.keyboard.press("Escape");
  await expect(history).toHaveAttribute("aria-expanded", "false");
  await expect(history).toBeFocused();
  await history.click();
  await page.getByRole("button", { name: /New conversation/ }).click();
  await expect(page.getByText("First chat")).toBeVisible();
  await expect(page.getByText("Sleep plan")).toBeHidden();
  await page.getByRole("button", { name: "Start a new conversation" }).click();
  await expect(page.getByText("First chat")).toBeHidden();
  await expect(
    page.getByText("Hello Alex. Tell me more about your goals."),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Write a message" })).toBeFocused();
  expect(state.created).toBe(1);
  await history.click();
  await page.getByRole("button", { name: "Delete this conversation" }).first().click();
  await expect(page.getByText("Delete this conversation?")).toBeVisible();
  expect(state.deleted).toEqual([]);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect.poll(() => state.deleted).toEqual(["coachee:u:new-1"]);
  await expect(page.getByText("Sleep plan")).toBeVisible();
});
test("a refused stored conversation falls back to the default one", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("hp_assistant_thread_coachee", "coachee:u:gone"),
  );
  const requested: string[] = [];
  await page.route("**/api/assistant/chat?*", async (route) => {
    const thread = new URL(route.request().url()).searchParams.get("thread");
    requested.push(thread ?? "");
    if (thread === "coachee:u:gone")
      return route.fulfill({ status: 401, json: { error: "unauthorized" } });
    return route.fulfill({
      json: [
        { id: "d", role: "assistant", parts: [{ type: "text", text: "Default chat" }] },
      ],
      headers: { "x-assistant-thread": "coachee:u" },
    });
  });
  await threads(page, []);
  await page.goto("/?assistant=1");
  await expect(page.getByText("Default chat")).toBeVisible();
  // StrictMode mounts twice, so the refused request can appear twice.
  expect(requested.at(-1)).toBe("");
  expect(requested.slice(0, -1).every((id) => id === "coachee:u:gone")).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("hp_assistant_thread_coachee")),
  ).toBe("coachee:u");
  await page.getByRole("button", { name: "Open past conversations" }).click();
  await expect(page.getByText("No past conversations yet")).toBeVisible();
});
