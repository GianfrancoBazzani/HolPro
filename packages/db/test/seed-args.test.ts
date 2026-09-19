import { expect, it } from "vitest";
import { parseSeedArgs } from "../src/seed/args";
it("accepts an optional coach and leading separator", () => {
  expect(parseSeedArgs(["client@example.com"])).toEqual({
    coacheeEmail: "client@example.com",
  });
  expect(
    parseSeedArgs(["--", "client@example.com", "coach@example.com"]),
  ).toEqual({
    coacheeEmail: "client@example.com",
    coachEmail: "coach@example.com",
  });
  expect(() => parseSeedArgs([])).toThrow();
  expect(() => parseSeedArgs(["a", "b", "c"])).toThrow();
});
