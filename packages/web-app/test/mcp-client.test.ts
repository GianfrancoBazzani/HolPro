import { afterEach, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/client";
vi.mock("../lib/mcp/token", () => ({
  mintMcpToken: vi.fn(async () => "coach"),
  verifyMcpToken: vi.fn(async (token?: string) =>
    token === "coach"
      ? {
          token,
          clientId: "holpro-agent",
          scopes: ["plans:read", "plans:publish"],
          extra: { userId: "coach", role: "coach" },
        }
      : undefined,
  ),
}));
vi.mock("../lib/plans/repository", () => ({
  listPlans: vi.fn(async () => []),
  readPlan: vi.fn(async () => {
    throw new Error("private failure");
  }),
  publishPlan: vi.fn(),
}));
import { POST, GET } from "../app/api/mcp/route";
import { mintMcpToken } from "../lib/mcp/token";
import { callPlanMcp } from "../lib/mcp/client";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it("connects the real SDK client and closes it on success and tool failure", async () => {
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  const close = vi.spyOn(Client.prototype, "close");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      expect(request.url).toBe("http://localhost:3000/api/mcp");
      expect(request.headers.get("authorization")).toBe("Bearer coach");
      return request.method === "GET" ? GET(request) : POST(request);
    }),
  );
  expect(
    await callPlanMcp({ userId: "coach", role: "coach" }, "list_plans", {}),
  ).toEqual([]);
  await expect(
    callPlanMcp({ userId: "coach", role: "coach" }, "read_plan", {
      planId: "11111111-1111-4111-8111-111111111111",
    }),
  ).rejects.toThrow("Unable to complete");
  expect(mintMcpToken).toHaveBeenCalledWith("coach", "coach");
  expect(close).toHaveBeenCalledTimes(2);
});
