import { noopObserve } from "@mastra/core/tools";
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../lib/mcp/client", () => ({ callMcp: vi.fn() }));
import { callMcp } from "../lib/mcp/client";
import {
  proposeCalendarChanges,
  readCalendarDraft,
} from "../mastra/tools/calendar-changes";
import { toRequestContext } from "../mastra/context";
const engagementId = "11111111-1111-4111-8111-111111111111";
const input = {
  engagementId,
  operations: [
    {
      op: "createItem" as const,
      tempId: "one",
      title: "Strength",
      kind: "training" as const,
    },
  ],
};
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
beforeEach(() => vi.clearAllMocks());
it("refuses coachee calendar writes and reads before MCP", async () => {
  await expect(
    proposeCalendarChanges.execute!(input, ctx("coachee")),
  ).rejects.toThrow("forbidden");
  await expect(
    readCalendarDraft.execute!({ engagementId }, ctx("coachee")),
  ).rejects.toThrow("forbidden");
  expect(callMcp).not.toHaveBeenCalled();
});
it("returns a proposal and forwards the trusted actor and abort signal", async () => {
  const result = {
    engagementId,
    draftId: "draft",
    status: "pending_review",
    submittedAt: "2026-09-20",
    operationCount: 1,
  };
  vi.mocked(callMcp).mockResolvedValueOnce(result);
  const signal = new AbortController().signal;
  expect(
    await proposeCalendarChanges.execute!(input, {
      ...ctx("coach"),
      abortSignal: signal,
    }),
  ).toEqual(result);
  expect(callMcp).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "u", role: "coach" }),
    "propose_calendar_changes",
    input,
    { signal },
  );
});
it("supports no pending draft and validates protocol output", async () => {
  vi.mocked(callMcp).mockResolvedValueOnce(null);
  expect(
    await readCalendarDraft.execute!({ engagementId }, ctx("coach")),
  ).toBeNull();
  vi.mocked(callMcp).mockResolvedValueOnce({ status: "published" });
  await expect(
    proposeCalendarChanges.execute!(input, ctx("coach")),
  ).rejects.toThrow();
});
