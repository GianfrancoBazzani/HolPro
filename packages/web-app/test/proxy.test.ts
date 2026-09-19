import { expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
const run = (url: string, cookie?: string) =>
  proxy(
    new NextRequest(new URL(url, "https://holpro.app"), {
      headers: cookie ? { cookie } : undefined,
    }),
  );
it("sends a visitor without a session to the portal login", () => {
  expect(run("/pro/settings").headers.get("location")).toBe(
    "https://holpro.app/pro/login",
  );
  expect(run("/app").headers.get("location")).toBe(
    "https://holpro.app/login",
  );
});
it("lets a session cookie through", () => {
  expect(
    run("/app", "better-auth.session_token=abc").headers.get("location"),
  ).toBeNull();
});
it("forwards a failed link to the login page, with or without a session", () => {
  for (const cookie of [undefined, "better-auth.session_token=abc"])
    expect(
      run("/pro?error=INVALID_TOKEN", cookie).headers.get("location"),
    ).toBe("https://holpro.app/pro/login?error=link_invalid");
  expect(run("/pro?error=private", undefined).headers.get("location")).toBe(
    "https://holpro.app/pro/login",
  );
});
