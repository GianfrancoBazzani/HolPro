import { noopObserve } from "@mastra/core/tools";
import { expect, it, vi } from "vitest";
vi.mock("../lib/mcp/client", () => ({ callMcp: vi.fn() }));
import { callMcp } from "../lib/mcp/client";
import { searchCoaches } from "../mastra/tools/search-coaches";
import { toRequestContext } from "../mastra/context";
const ctx = (role: "coach" | "coachee") => ({
  observe: noopObserve,
  requestContext: toRequestContext({
    userId: "u",
    name: "Alex",
    role,
    locale: "en",
    timezone: "UTC",
    onboarding: true,
    goalsSaved: true,
  }),
});
it("refuses coaches before calling MCP", async () => {
  await expect(
    searchCoaches.execute!({ query: "strength" }, ctx("coach")),
  ).rejects.toThrow("forbidden");
  expect(callMcp).not.toHaveBeenCalled();
});
it("searches with the coachee identity and validates the result", async () => {
  vi.mocked(callMcp).mockResolvedValueOnce({
    coaches: [
      { coachId: "c", name: "Ana", bio: "Strength", specialties: [] },
    ],
  });
  expect(
    await searchCoaches.execute!({ query: "strength" }, ctx("coachee")),
  ).toEqual({
    coaches: [{ coachId: "c", name: "Ana", bio: "Strength", specialties: [] }],
  });
  expect(callMcp).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "u", role: "coachee" }),
    "search_coaches",
    { query: "strength" },
    expect.any(Object),
  );
  vi.mocked(callMcp).mockResolvedValueOnce({ coaches: [{ name: "x" }] });
  await expect(
    searchCoaches.execute!({}, ctx("coachee")),
  ).rejects.toThrow();
});
