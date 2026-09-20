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
    surface: "web",
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

it("returns pending review rather than claiming publication", async () => {
  const result = {
    planId: "p",
    status: "pending_review",
    submittedAt: "2026-09-20",
  };
  vi.mocked(callMcp).mockResolvedValueOnce(result);
  expect(
    await publishPlanDocument.execute!(
      {
        engagementId: "11111111-1111-4111-8111-111111111111",
        title: "Plan",
        html: "x",
      },
      ctx("coach"),
    ),
  ).toEqual(result);
});
it("parses draft content through the assistant read tool", async () => {
  const { readPlanDocument } = await import("../mastra/tools/plan-documents");
  const result = {
    planId: "p",
    draftId: "d",
    title: "Draft",
    html: "x",
    submittedAt: "2026-09-20",
  };
  vi.mocked(callMcp).mockResolvedValueOnce(result);
  expect(
    await readPlanDocument.execute!(
      { planId: "11111111-1111-4111-8111-111111111111", draft: true },
      ctx("coach"),
    ),
  ).toEqual(result);
});
