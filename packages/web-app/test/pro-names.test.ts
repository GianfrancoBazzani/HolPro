import { expect, it } from "vitest";
import { initials } from "../lib/pro/names";
it("takes the first letter of the first two words", () => {
  expect(initials("Adriana Pezzano", "en")).toBe("AP");
  expect(initials("Maria Angela Chiecca", "en")).toBe("MA");
  expect(initials("  cher  ", "en")).toBe("C");
  expect(initials("", "en")).toBe("");
  expect(initials("ilkay", "tr")).toBe("İ");
});
