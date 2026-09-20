import { afterEach, expect, it, vi } from "vitest";
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { InMemoryStore } from "@mastra/core/storage";
import { Memory } from "@mastra/memory";
import { createTool } from "@mastra/core/tools";
import { MastraLanguageModelV2Mock } from "@mastra/core/test-utils/llm-mock";
import { z } from "zod";
const state = vi.hoisted(() => ({
  link: undefined as Record<string, unknown> | undefined,
  agent: undefined as unknown,
  mastra: undefined as unknown,
}));
vi.mock("../lib/telegram/links", () => ({
  findUserLink: async (userId: string) =>
    state.link?.userId === userId ? state.link : undefined,
  findTelegramLink: async (id: number) =>
    state.link?.telegramUserId === id ? state.link : undefined,
  revokeLink: async () => {
    if (state.link) state.link.revokedAt = new Date();
    return state.link;
  },
  deleteRevokedLink: async () => {
    state.link = undefined;
  },
  pendingLink: vi.fn(),
  consumeLink: vi.fn(),
}));
vi.mock("../lib/auth/repository", () => ({
  loadUserWithRoles: async (userId: string) => ({
    id: userId,
    name: "Alex",
    timezone: "UTC",
    locale: "en",
    status: "active",
    deletedAt: null,
    coach: {},
    coachee: null,
  }),
}));
vi.mock("../mastra", () => ({
  getAssistant: () => state.agent,
  get mastra() {
    return state.mastra;
  },
}));
import { createTelegramChannels } from "../mastra/channels";
import { currentScope, drainRuns } from "../lib/telegram/lifecycle";
import {
  removeLink,
  stopTelegramRuntime,
  getTelegramRuntime,
} from "../lib/telegram/runtime";
type Part =
  Awaited<
    ReturnType<MastraLanguageModelV2Mock["doStream"]>
  >["stream"] extends ReadableStream<infer P>
    ? P
    : never;
afterEach(async () => {
  await stopTelegramRuntime();
  await (state.mastra as Mastra | undefined)?.shutdown();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it.each(["complete", "cancel"])(
  "routes real channel events through guarded output (%s) before relink",
  async (outcome) => {
    const userId = `u-${outcome}`;
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test");
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "holpro_bot");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET_TOKEN", "secret");
    vi.stubEnv("TELEGRAM_MODE", "webhook");
    const sent: { method: string; text: string; generation?: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const method = String(url).split("/").at(-1)!;
        const payload = JSON.parse(String(init?.body ?? "{}"));
        if (method === "getMe")
          return Response.json({
            ok: true,
            result: {
              id: 99,
              is_bot: true,
              first_name: "Bot",
              username: "holpro_bot",
            },
          });
        if (method.startsWith("send") && method !== "sendChatAction") {
          const scope = currentScope();
          sent.push({
            method,
            text: payload.text,
            generation: scope && !("system" in scope) ? scope.id : undefined,
          });
        }
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
    state.link = {
      id: "old",
      userId,
      role: "coach",
      telegramUserId: 7,
      telegramChatId: 7,
      telegramUsername: null,
      linkedAt: new Date(),
      revokedAt: null,
    };
    let calls = 0,
      finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let taskAborted = false;
    let completed = false;
    const model = new MastraLanguageModelV2Mock({
      doStream: async () => {
        calls++;
        const text =
          calls === 1
            ? "Working on old task."
            : completed && state.link?.id === "old"
              ? "Task completed."
              : "New conversation.";
        const parts: Part[] = [
          { type: "stream-start", warnings: [] },
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: text },
          { type: "text-end", id: "t" },
        ];
        if (calls === 1)
          parts.push({
            type: "tool-call",
            toolCallId: "old-task",
            toolName: "task",
            input: "{}",
          });
        parts.push({
          type: "finish",
          finishReason: calls === 1 ? "tool-calls" : "stop",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        });
        return {
          stream: new ReadableStream<Part>({
            start(c) {
              parts.forEach((p) => c.enqueue(p));
              c.close();
            },
          }),
        };
      },
    });
    const agent = new Agent({
      id: "holpro-assistant",
      name: "Test",
      instructions: "Test",
      model,
      channels: createTelegramChannels(),
      memory: new Memory({
        options: { generateTitle: false, lastMessages: 10 },
      }),
      tools: {
        task: createTool({
          id: "task",
          description: "Task",
          inputSchema: z.object({}),
          outputSchema: z.string(),
          background: { enabled: true, defaultDisposition: "deferred" },
          execute: async (_, context) => {
            context?.abortSignal?.addEventListener(
              "abort",
              () => {
                taskAborted = true;
                finish();
              },
              { once: true },
            );
            await gate;
            return "OLD PRIVATE RESULT";
          },
        }),
      },
    });
    const mastra = new Mastra({
      agents: { agent },
      storage: new InMemoryStore(),
      backgroundTasks: { enabled: true },
    });
    state.agent = agent;
    state.mastra = mastra;
    const channels = agent.getChannels()!;
    await channels.initialize(mastra);
    expect((await getTelegramRuntime()).mastra).toBe(mastra);
    let messageId = 0;
    const deliver = async (text: string) =>
      channels.handleWebhookEvent(
        "telegram",
        new Request("http://localhost/api/telegram/webhook", {
          method: "POST",
          headers: { "x-telegram-bot-api-secret-token": "secret" },
          body: JSON.stringify({
            update_id: ++messageId,
            message: {
              message_id: messageId,
              date: 1,
              chat: { id: 7, type: "private" },
              from: {
                id: 7,
                first_name: "Alex",
                is_bot: false,
                language_code: "en",
              },
              text,
            },
          }),
        }),
      );
    try {
      expect((await deliver("Start task")).status).toBe(200);
      await vi.waitFor(
        () =>
          expect(
            sent.some(
              (s) =>
                s.text?.includes("Working on old task.") &&
                s.generation === "old",
            ),
          ).toBe(true),
        { timeout: 3000 },
      );
      await vi.waitFor(async () =>
        expect(
          (await mastra.backgroundTaskManager!.listTasks({ status: "running" }))
            .tasks,
        ).toHaveLength(1),
      );
      if (outcome === "complete") {
        await deliver("Another question while working");
        await vi.waitFor(
          () =>
            expect(
              sent.some(
                (s) => s.generation === "old" && s.text === "New conversation.",
              ),
            ).toBe(true),
          { timeout: 3000 },
        );
        completed = true;
        finish();
        await vi.waitFor(
          () =>
            expect(
              sent.filter(
                (s) =>
                  s.method === "sendMessage" && s.text === "Task completed.",
              ),
            ).toHaveLength(1),
          { timeout: 3000 },
        );
      }
      await removeLink(userId, "old");
      expect(taskAborted).toBe(outcome === "cancel");
      expect(
        (
          await mastra.backgroundTaskManager!.listTasks({
            status: ["running", "pending", "suspended"],
          })
        ).tasks,
      ).toHaveLength(0);
      expect(state.link).toBeUndefined();
      expect(
        await agent
          .getMemory()!
          .then((m) => m!.getThreadById({ threadId: `telegram:${userId}` })),
      ).toBeNull();
      state.link = {
        id: "new",
        userId,
        role: "coach",
        telegramUserId: 7,
        telegramChatId: 7,
        telegramUsername: null,
        linkedAt: new Date(),
        revokedAt: null,
      };
      await deliver("Fresh question");
      await vi.waitFor(
        () =>
          expect(
            sent.some(
              (s) => s.generation === "new" && s.text === "New conversation.",
            ),
          ).toBe(true),
        { timeout: 3000 },
      );
      expect(
        sent
          .filter((s) => s.generation === "new")
          .some((s) => s.text.includes("OLD PRIVATE RESULT")),
      ).toBe(false);
      const prompt = JSON.stringify(model.doStreamCalls.at(-1)?.prompt);
      expect(prompt).not.toContain("OLD PRIVATE RESULT");
      await removeLink(userId, "old");
      expect(state.link?.id).toBe("new");
    } finally {
      finish();
      if (state.link) await removeLink(userId);
      await drainRuns("old");
    }
  },
  15000,
);
