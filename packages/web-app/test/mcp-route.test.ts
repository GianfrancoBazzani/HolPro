import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../lib/mcp/token", () => ({
  verifyMcpToken: vi.fn(async (token?: string) =>
    token
      ? {
          token,
          clientId: "holpro-agent",
          scopes:
            token === "coach"
              ? ["plans:read", "plans:publish"]
              : ["plans:read"],
          extra: { userId: token, role: token },
        }
      : undefined,
  ),
}));
vi.mock("../lib/plans/repository", () => ({
  listPlans: vi.fn(async () => []),
  readPlan: vi.fn(async () => {
    throw new Error("database secret");
  }),
  publishPlan: vi.fn(async () => ({
    planId: "p",
    versionNumber: 1,
    publishedAt: "2026-09-20T00:00:00.000Z",
  })),
}));
import { POST } from "../app/api/mcp/route";
import { publishPlan } from "../lib/plans/repository";
const engagementId = "11111111-1111-4111-8111-111111111111";
function request(method: string, params: unknown, token = "coach") {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}
async function json(response: Response) {
  const text = await response.text();
  if (text.startsWith("event:") || text.startsWith("data:"))
    return JSON.parse(
      text
        .split("\n")
        .find((line) => line.startsWith("data:"))!
        .slice(5),
    );
  return JSON.parse(text);
}
beforeEach(() => vi.clearAllMocks());
it("requires a bearer token", async () => {
  expect((await POST(request("tools/list", {}, ""))).status).toBe(401);
});
it("registers all three real MCP tools", async () => {
  const data = await json(await POST(request("tools/list", {})));
  expect(data.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
    "publish_plan",
    "list_plans",
    "read_plan",
  ]);
});
it("publishes valid HTML through the real protocol", async () => {
  const data = await json(
    await POST(
      request("tools/call", {
        name: "publish_plan",
        arguments: { engagementId, html: "<h1>Plan</h1>", title: "Plan" },
      }),
    ),
  );
  expect(data.result.isError).not.toBe(true);
  expect(JSON.parse(data.result.content[0].text)).toMatchObject({
    versionNumber: 1,
  });
});
it.each([
  { engagementId, html: "x" },
  { engagementId, title: "T", html: "x".repeat(2_000_001) },
])("rejects invalid publication before repository access", async (input) => {
  const data = await json(
    await POST(
      request("tools/call", { name: "publish_plan", arguments: input }),
    ),
  );
  expect(data.result?.isError || data.error).toBeTruthy();
  expect(publishPlan).not.toHaveBeenCalled();
});
it("rejects coachee writes and hides raw backend errors", async () => {
  const denied = await json(
    await POST(
      request(
        "tools/call",
        {
          name: "publish_plan",
          arguments: { engagementId, title: "T", html: "x" },
        },
        "coachee",
      ),
    ),
  );
  expect(denied.result.isError).toBe(true);
  expect(publishPlan).not.toHaveBeenCalled();
  const failed = await json(
    await POST(
      request("tools/call", {
        name: "read_plan",
        arguments: { planId: engagementId },
      }),
    ),
  );
  expect(failed.result.isError).toBe(true);
  expect(JSON.stringify(failed)).not.toContain("database secret");
});
