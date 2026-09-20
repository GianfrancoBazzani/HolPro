import { expect, it } from "vitest";
import { buildAssistantContext, buildInstructions } from "../mastra/context";
const user = { id: "u", name: "Alex", timezone: "Europe/Malta" };
it("derives identity and onboarding from trusted data", () => {
  expect(
    buildAssistantContext(user, "coachee", "it", {
      onboarding: true,
      goalsSaved: true,
    }),
  ).toEqual({
    userId: "u",
    name: "Alex",
    role: "coachee",
    timezone: "Europe/Malta",
    locale: "it",
    onboarding: true,
    goalsSaved: true,
  });
  expect(
    buildAssistantContext(user, "coach", "en", {
      onboarding: true,
      goalsSaved: true,
    }),
  ).toMatchObject({ role: "coach", onboarding: false, goalsSaved: false });
});
it.each([
  ["en", "English"],
  ["es", "Español"],
  ["it", "Italiano"],
] as const)("instructs in %s and uses the local date", async (locale, language) => {
  const instructions = await buildInstructions(
    buildAssistantContext(user, "coachee", locale, {
      onboarding: true,
      goalsSaved: false,
    }),
    new Date("2026-09-20T23:00:00Z"),
  );
  expect(instructions).toContain(`Answer in ${language}`);
  expect(instructions).toContain("coachee-onboarding");
  expect(instructions).toContain("saveOnboardingGoals");
  expect(instructions).toContain("Europe/Malta");
  expect(instructions).toContain("21");
});
it("stops collecting after goals are saved without ending onboarding", async () => {
  const instructions = await buildInstructions(
    buildAssistantContext(user, "coachee", "en", {
      onboarding: true,
      goalsSaved: true,
    }),
  );
  expect(instructions).toContain("goals are saved");
  expect(instructions).toContain("searchCoaches");
  expect(instructions).not.toContain("use the coachee-onboarding");
});
