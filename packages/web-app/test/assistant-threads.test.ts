import { beforeEach, expect, it, vi } from "vitest";
import { MemoryMySQL, StoreOperationsMySQL } from "@mastra/mysql";
import type { Pool } from "mysql2/promise";
vi.mock("../lib/auth/server", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("../lib/auth/repository", () => ({ loadUserWithRoles: vi.fn() }));
const { memory } = await vi.hoisted(async () => ({
  memory: (await import("./helpers/thread-memory")).threadMemory(),
}));
vi.mock("../mastra", () => ({ getAssistantMemory: async () => memory }));
import { auth } from "../lib/auth/server";
import { loadUserWithRoles } from "../lib/auth/repository";
import { DELETE, GET, POST } from "../app/api/assistant/threads/route";
const user = {
  id: "u",
  name: "Alex",
  timezone: "UTC",
  coach: null,
  coachee: {},
  status: "active",
  deletedAt: null,
};
const at = (day: number) => new Date(Date.UTC(2026, 0, day));
function seed(id: string, resourceId: string, day: number, title?: string) {
  memory.threads.set(id, {
    id,
    resourceId,
    title,
    createdAt: at(day),
    updatedAt: at(day),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  memory.threads.clear();
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: "u" },
    session: { id: "session" },
  } as Awaited<ReturnType<typeof auth.api.getSession>>);
  vi.mocked(loadUserWithRoles).mockResolvedValue(
    user as Awaited<ReturnType<typeof loadUserWithRoles>>,
  );
});
const request = (query: string, method = "GET") =>
  new Request(`http://localhost/api/assistant/threads?${query}`, { method });
it("rejects a missing session and a wrong portal", async () => {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
  expect((await GET(request("portal=coachee"))).status).toBe(401);
  expect((await GET(request("portal=coach"))).status).toBe(401);
  expect((await POST(request("portal=coach", "POST"))).status).toBe(401);
});
it("lists the 20 newest conversations of the portal, newest first, without Telegram threads", async () => {
  for (let i = 1; i <= 22; i++) seed(`coachee:u:${i}`, "u", i, `Title ${i}`);
  seed("coachee:u", "u", 25);
  seed("telegram:u", "u", 30, "Telegram");
  seed("coach:u", "u", 30, "Coach");
  seed("coachee:v:1", "v", 30, "Other");
  const response = await GET(request("portal=coachee"));
  expect(response.headers.get("cache-control")).toBe("no-store");
  const list = (await response.json()) as {
    id: string;
    title: string | null;
    updatedAt: string;
  }[];
  expect(list).toHaveLength(20);
  expect(list[0]).toEqual({
    id: "coachee:u",
    title: null,
    updatedAt: at(25).toISOString(),
  });
  expect(list[1]).toEqual({
    id: "coachee:u:22",
    title: "Title 22",
    updatedAt: at(22).toISOString(),
  });
  expect(list.at(-1)?.id).toBe("coachee:u:4");
  expect(list.map((c) => c.id)).not.toContain("telegram:u");
});
it("creates an empty thread with the portal in its metadata", async () => {
  const response = await POST(request("portal=coachee", "POST"));
  expect(response.status).toBe(201);
  const { id } = (await response.json()) as { id: string };
  expect(id.startsWith("coachee:u:")).toBe(true);
  expect(memory.saveThread).toHaveBeenCalledWith({
    thread: expect.objectContaining({
      id,
      resourceId: "u",
      metadata: { portal: "coachee" },
    }),
  });
  expect(memory.threads.get(id)?.title).toBe("");
});
it("creates an untitled conversation through the MySQL adapter without a null title", async () => {
  const inserts: unknown[][] = [];
  const pool = {
    execute: async (_sql: string, args: unknown[]) => {
      // mastra_threads.title is TEXT NOT NULL; emulate that database constraint.
      if (args[2] == null) throw new Error("Column 'title' cannot be null");
      inserts.push(args);
      return [{ affectedRows: 1 }, []];
    },
  } as unknown as Pool;
  const storage = new MemoryMySQL({
    pool,
    operations: new StoreOperationsMySQL({ pool }),
  });
  memory.saveThread.mockImplementationOnce((args) => storage.saveThread(args));
  const response = await POST(request("portal=coachee", "POST"));
  expect(response.status).toBe(201);
  const { id } = await response.json();
  expect(inserts).toHaveLength(1);
  expect(inserts[0].slice(0, 3)).toEqual([id, "u", ""]);
});
it("deletes an owned thread and refuses foreign, Telegram and missing ids", async () => {
  seed("coachee:u:mine", "u", 1);
  seed("coachee:u:stolen", "v", 1);
  seed("telegram:u", "u", 1);
  const del = (thread?: string) =>
    DELETE(
      request(
        thread
          ? `portal=coachee&thread=${encodeURIComponent(thread)}`
          : "portal=coachee",
        "DELETE",
      ),
    );
  const ok = await del("coachee:u:mine");
  expect(ok.status).toBe(204);
  expect(memory.deleteThread).toHaveBeenCalledWith("coachee:u:mine");
  expect((await del("coachee:u:stolen")).status).toBe(401);
  expect((await del("telegram:u")).status).toBe(401);
  expect((await del("coachee:u:gone")).status).toBe(401);
  expect((await del()).status).toBe(400);
  expect(memory.deleteThread).toHaveBeenCalledTimes(1);
});
