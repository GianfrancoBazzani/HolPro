import { noopObserve } from "@mastra/core/tools";
import { expect, it, vi } from "vitest";
vi.mock("../lib/mcp/client", () => ({ callMcp: vi.fn() }));
import { callMcp } from "../lib/mcp/client";
import {
  publishPlanDocument,
  listPlanDocuments,
} from "../mastra/tools/plan-documents";
import { toRequestContext } from "../mastra/context";
const ctx = (role: "coach" | "coachee") => ({
  observe: noopObserve,
  requestContext: toRequestContext({
    userId: "u",
    name: "Alex",
    role,
    locale: "en",
    timezone: "UTC",
    onboarding: false,
    goalsSaved: false,
  }),
});
it("refuses coachee publication before minting or calling MCP", async () => {
  await expect(
    publishPlanDocument.execute!(
      {
        engagementId: "11111111-1111-4111-8111-111111111111",
        title: "Plan",
        html: "<p>Plan</p>",
      },
      ctx("coachee"),
    ),
  ).rejects.toThrow("forbidden");
  expect(callMcp).not.toHaveBeenCalled();
});
it("takes list identity from trusted request context", async () => {
  vi.mocked(callMcp).mockResolvedValueOnce([]);
  expect(await listPlanDocuments.execute!({}, ctx("coachee"))).toEqual([]);
  expect(callMcp).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "u", role: "coachee" }),
    "list_plans",
    {},
    expect.any(Object),
  );
});
