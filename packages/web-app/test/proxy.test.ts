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
  expect(run("/app").headers.get("location")).toBe("https://holpro.app/login");
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
it("keeps public URLs canonical and records only seen marketing language", () => {
  expect(run("/").headers.get("x-middleware-rewrite")).toBe(
    "https://holpro.app/en",
  );
  expect(run("/").cookies.get("hp_seen")?.value).toBe("en");
  expect(run("/es").headers.get("x-middleware-rewrite")).toBeNull();
  expect(run("/es").cookies.get("hp_seen")?.value).toBe("es");
  expect(run("/en?x=1").headers.get("location")).toBe(
    "https://holpro.app/?x=1",
  );
  expect(run("/en").status).toBe(308);
  expect(run("/es/login?token=x").headers.get("location")).toBe(
    "https://holpro.app/login?token=x",
  );
  expect(run("/es/pro/settings?a=b").headers.get("location")).toBe(
    "https://holpro.app/pro/settings?a=b",
  );
  expect(run("/es", "hp_locale=en").cookies.get("hp_seen")).toBeUndefined();
});
it("resolves product language without changing the browser URL", () => {
  expect(
    run("/login", "hp_locale=es").headers.get("x-middleware-rewrite"),
  ).toBe("https://holpro.app/es/login");
  expect(run("/login", "hp_seen=es").headers.get("x-middleware-rewrite")).toBe(
    "https://holpro.app/es/login",
  );
  expect(run("/login").headers.get("x-middleware-rewrite")).toBe(
    "https://holpro.app/en/login",
  );
  expect(run("/unsupported-path", "hp_locale=es").headers.get("x-middleware-rewrite")).toBe(
    "https://holpro.app/es/unsupported-path",
  );
  expect(
    proxy(
      new NextRequest("https://holpro.app/login", {
        headers: { "accept-language": "es-ES" },
      }),
    ).headers.get("x-middleware-rewrite"),
  ).toBe("https://holpro.app/es/login");
  expect(
    run("/pro/login/welcome", "hp_seen=es").headers.get("x-middleware-rewrite"),
  ).toBe("https://holpro.app/es/pro/login/welcome");
  expect(
    run("/app?x=1", "better-auth.session_token=abc; hp_locale=es").headers.get(
      "x-middleware-rewrite",
    ),
  ).toBe("https://holpro.app/es/app?x=1");
});
