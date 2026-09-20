import { test, expect, type Page } from "@playwright/test";
const streamHeaders = {
  "content-type": "text/event-stream",
  "x-vercel-ai-ui-message-stream": "v1",
};
function reply(text: string) {
  return (
    [
      { type: "start", messageId: "reply-1" },
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
