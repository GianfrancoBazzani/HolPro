import { describe, expect, it } from "vitest";
import {
  portals,
  portalFromPath,
  portalUrls,
  rejectDestination,
  callbackError,
} from "../lib/auth/portals";
import { decideGate } from "../lib/auth/policy";
import {
  registrationSchema,
  resetSchema,
  signUpSchema,
  timezone,
} from "../lib/auth/schemas";
describe("portals", () => {
  for (const portal of Object.values(portals))
    it(portal.key, () => {
      expect(portalFromPath(portal.homePath)).toEqual(portal);
      expect(portalUrls(portal).sent("magic")).toBe(
        `${portal.basePath}/sent?kind=magic`,
      );
      expect(portalUrls(portal).home).toBe(portal.homePath);
      expect(portalUrls(portal).resetOk).toBe(`${portal.basePath}?reset=ok`);
      expect(portalUrls(portal).reject(true)).toBe(
        `/api/gate/reject?portal=${portal.key}&reason=account_unavailable`,
      );
      expect(portalUrls(portal).reset).toBe(`${portal.basePath}/reset`);
      expect(portalUrls(portal).welcome).toBe(`${portal.basePath}/welcome`);
      expect(portalUrls(portal).login("link_invalid")).toBe(
        `${portal.basePath}?error=link_invalid`,
      );
    });
  it("uses path boundaries and rejects open redirects", () => {
    expect(portalFromPath("/professional").key).toBe("coachee");
    expect(rejectDestination("https://evil.com", "evil")).toBe(
      "/login?error=wrong_portal",
    );
    expect(rejectDestination("coach", "account_unavailable")).toBe(
      "/pro/login?error=account_unavailable",
    );
    expect(rejectDestination("coach", "evil")).toBe(
      "/pro/login?error=wrong_portal",
    );
  });
  it.each(["invalid_token", "token_expired", "INVALID_TOKEN", "TOKEN_EXPIRED"])(
    "maps %s",
    (code) => expect(callbackError(code)).toBe("link_invalid"),
  );
  it("drops unknown errors", () =>
    expect(callbackError("private-info")).toBeUndefined());
});
describe("gate matrix", () => {
  it("blocks a missing user", () =>
    expect(decideGate(undefined, portals.coach)).toBe("blocked"));
  for (const portal of Object.values(portals))
    for (const status of ["pending", "active", "suspended"])
      for (const deletedAt of [null, new Date()])
        for (const hasCoach of [false, true])
          for (const hasCoachee of [false, true]) {
            it(`${portal.key}/${status}/${!!deletedAt}/${hasCoach}/${hasCoachee}`, () => {
              const expected =
                status === "suspended" || deletedAt
                  ? "blocked"
                  : (portal.key === "coach" ? hasCoach : hasCoachee)
                    ? "enter"
                    : hasCoach || hasCoachee
                      ? "reject"
                      : "register";
              expect(
                decideGate(
                  {
                    status,
                    deletedAt,
                    coach: hasCoach ? {} : null,
                    coachee: hasCoachee ? {} : null,
                  },
                  portal,
                ),
              ).toBe(expected);
            });
          }
});
describe("validation", () => {
  it("validates timezones", () => {
    expect(timezone("America/Lima")).toBe("America/Lima");
    expect(timezone("Evil/Value")).toBe("UTC");
    expect(timezone("")).toBe("UTC");
  });
  it.each([11, 12, 128, 129])("password length %s", (n) =>
    expect(
      signUpSchema.safeParse({
        name: "Jo",
        email: "jo@example.com",
        password: "a".repeat(n),
      }).success,
    ).toBe(n >= 12 && n <= 128),
  );
  it.each([1, 2, 120, 121])("name length %s", (n) =>
    expect(
      registrationSchema.safeParse({ name: "a".repeat(n), timezone: "" })
        .success,
    ).toBe(n >= 2 && n <= 120),
  );
  it("rejects bad email and mismatched passwords", () => {
    expect(
      signUpSchema.safeParse({
        name: "Jo",
        email: "bad",
        password: "a".repeat(12),
      }).success,
    ).toBe(false);
    expect(
      resetSchema.safeParse({
        token: "x",
        password: "a".repeat(12),
        confirmPassword: "b".repeat(12),
      }).success,
    ).toBe(false);
  });
});
