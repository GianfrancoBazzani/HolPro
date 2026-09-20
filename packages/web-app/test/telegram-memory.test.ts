import { expect, it, vi } from "vitest";
import type { Agent } from "@mastra/core/agent";
import type { TelegramLink } from "../lib/telegram/links";
import {
  cleanTelegramMemory,
  verifyTelegramMemory,
} from "../mastra/telegram-memory";
function fixture() {
  const threads = new Map([
    [
      "telegram:previous",
      {
        id: "telegram:previous",
        resourceId: "previous",
        metadata: {
          channel_externalThreadId: "telegram:7",
          channel_ownerId: "holpro-assistant",
        },
      },
    ],
    ["telegram:u", { id: "telegram:u", resourceId: "u", metadata: {} }],
    ["coach:u", { id: "coach:u", resourceId: "u", metadata: {} }],
    [
      "other:u",
      {
        id: "other:u",
        resourceId: "u",
        metadata: {
          channel_externalThreadId: "telegram:7",
          channel_ownerId: "another-agent",
        },
      },
    ],
  ]);
  const resource = { workingMemory: "Shared coaching profile" };
  const memory = {
    listThreads: vi.fn(async ({ filter }) => ({
      threads: [...threads.values()].filter((t) =>
        Object.entries(filter.metadata).every(
          ([key, value]) =>
            t.metadata[key as keyof typeof t.metadata] === value,
        ),
      ),
    })),
    getThreadById: async ({ threadId }: { threadId: string }) =>
      threads.get(threadId) ?? null,
    deleteThread: vi.fn(async (id: string) => {
      threads.delete(id);
    }),
    updateResource: vi.fn(),
  };
  const unsubscribe = vi.fn();
  const agent = {
    id: "holpro-assistant",
    getMemory: async () => memory,
    getChannels: () => ({ sdk: { thread: () => ({ unsubscribe }) } }),
  } as unknown as Agent;
  const link = { userId: "u", telegramChatId: 7 } as TelegramLink;
  return { agent, link, memory, threads, resource, unsubscribe };
}
it("pins mapping keys, clears stale Telegram transcripts, and preserves web/resource state", async () => {
  const f = fixture();
  await cleanTelegramMemory(f.agent, f.link);
  expect(f.memory.listThreads).toHaveBeenCalledWith({
    filter: {
      metadata: {
        channel_externalThreadId: "telegram:7",
        channel_ownerId: "holpro-assistant",
      },
    },
    perPage: false,
  });
  expect([...f.threads.keys()]).toEqual(["coach:u", "other:u"]);
  expect(f.unsubscribe).toHaveBeenCalledOnce();
  expect(f.memory.updateResource).not.toHaveBeenCalled();
  expect(f.resource.workingMemory).toBe("Shared coaching profile");
});
it("refuses an existing mapping owned by another resource before dispatch", async () => {
  const f = fixture();
  await expect(verifyTelegramMemory(f.agent, f.link)).rejects.toThrow(
    "telegram_thread_owner_conflict",
  );
  expect(f.memory.deleteThread).not.toHaveBeenCalled();
});
