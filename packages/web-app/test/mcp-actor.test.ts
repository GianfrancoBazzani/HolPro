import { expect, it } from "vitest";
import { requireScope, McpScopeError } from "../lib/mcp/actor";
import { scopesFor } from "../lib/mcp/token-scopes";
const auth = (role: "coach" | "coachee") => ({
  token: "t",
  clientId: "holpro-agent",
  scopes: scopesFor(role),
  extra: { userId: "u", role },
});
it("lists the spec scopes per role", () => {
  expect(scopesFor("coachee")).toEqual([
    "plans:read",
    "coaches:search",
    "onboarding:apply",
  ]);
  expect(scopesFor("coach")).toEqual([
    "plans:read",
    "plans:publish",
    "onboarding:review",
  ]);
});
it("returns the actor when every scope is present", () => {
  expect(requireScope(auth("coach"), "plans:read", "plans:publish")).toEqual({
    userId: "u",
    role: "coach",
  });
  expect(requireScope(auth("coachee"), "coaches:search")).toEqual({
    userId: "u",
    role: "coachee",
  });
});
it("throws a scope error for missing scopes, identity or auth", () => {
  expect(() => requireScope(auth("coachee"), "plans:publish")).toThrow(
    McpScopeError,
  );
  expect(() => requireScope(undefined, "plans:read")).toThrow(McpScopeError);
  expect(() =>
    requireScope({ ...auth("coach"), extra: { role: "coach" } }, "plans:read"),
  ).toThrow(McpScopeError);
});
