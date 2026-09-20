import { vi } from "vitest";
import type { StorageThreadType } from "@mastra/core/memory";
export type StoredThread = {
  id: string;
  resourceId: string;
  title?: string;
  updatedAt: Date | string;
  metadata?: Record<string, unknown>;
};
const hydrate = (thread: StoredThread): StorageThreadType => ({
  ...thread,
  createdAt: new Date(thread.updatedAt),
  updatedAt: new Date(thread.updatedAt),
});
// An in-memory stand-in for the Mastra thread store used by the assistant routes.
export function threadMemory(seed: StoredThread[] = []) {
  const threads = new Map(seed.map((thread) => [thread.id, hydrate(thread)]));
  return {
    threads,
    listThreads: vi.fn(
      async ({
        filter,
        orderBy,
      }: {
        filter?: { resourceId?: string };
        orderBy?: { field?: "createdAt" | "updatedAt"; direction?: "ASC" | "DESC" };
      }) => {
        const field = orderBy?.field ?? "updatedAt",
          sign = orderBy?.direction === "ASC" ? 1 : -1;
        const rows = [...threads.values()]
          .filter((t) => !filter?.resourceId || t.resourceId === filter.resourceId)
          .sort((a, b) => sign * (a[field].getTime() - b[field].getTime()));
        return { threads: rows, total: rows.length, page: 0, perPage: false as const, hasMore: false };
      },
    ),
    getThreadById: vi.fn(
      async ({ threadId }: { threadId: string }) => threads.get(threadId) ?? null,
    ),
    saveThread: vi.fn(async ({ thread }: { thread: StorageThreadType }) => {
      threads.set(thread.id, thread);
      return thread;
    }),
    deleteThread: vi.fn(async (id: string) => {
      threads.delete(id);
    }),
    recall: vi.fn(async () => ({ messages: [] })),
  };
}
