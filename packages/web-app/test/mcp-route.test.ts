import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../lib/mcp/token", async () => {
  const { scopesFor } = await import("../lib/mcp/token-scopes");
  return {
    verifyMcpToken: vi.fn(async (token?: string) =>
      token === "coach" || token === "coachee"
        ? {
            token,
            clientId: "holpro-agent",
            scopes: scopesFor(token),
            extra: { userId: token, role: token },
          }
        : undefined,
    ),
  };
});
vi.mock("../lib/coaches/repository", () => ({
  searchCoaches: vi.fn(async () => [
    { coachId: "c", name: "Ana", bio: "Strength", specialties: ["strength"] },
  ]),
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
import { searchCoaches } from "../lib/coaches/repository";
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
it("registers the four real MCP tools", async () => {
  const data = await json(await POST(request("tools/list", {})));
  expect(data.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
    "publish_plan",
    "list_plans",
    "read_plan",
    "search_coaches",
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
it("searches coaches for coachees and denies coaches", async () => {
  const found = await json(
    await POST(
      request(
        "tools/call",
        { name: "search_coaches", arguments: { query: "strength" } },
        "coachee",
      ),
    ),
  );
  expect(found.result.isError).not.toBe(true);
  expect(JSON.parse(found.result.content[0].text)).toEqual({
    coaches: [
      { coachId: "c", name: "Ana", bio: "Strength", specialties: ["strength"] },
    ],
  });
  expect(searchCoaches).toHaveBeenCalledWith("strength");
  const denied = await json(
    await POST(
      request("tools/call", { name: "search_coaches", arguments: {} }, "coach"),
    ),
  );
  expect(denied.result.isError).toBe(true);
  expect(searchCoaches).toHaveBeenCalledTimes(1);
  const tooLong = await json(
    await POST(
      request(
        "tools/call",
        { name: "search_coaches", arguments: { query: "x".repeat(201) } },
        "coachee",
      ),
    ),
  );
  expect(tooLong.result?.isError || tooLong.error).toBeTruthy();
  expect(searchCoaches).toHaveBeenCalledTimes(1);
});
