import { expect, it } from "vitest";
import { skillSchema, profileSchema, limits } from "../lib/pro/schemas";
const base = { description: "Use when onboarding.", instructions: "Ask." };
it("accepts spec-style skill names and rejects the rest", () => {
  expect(skillSchema.safeParse({ ...base, name: "client-intake" }).success).toBe(
    true,
  );
  for (const name of [
    "Client Intake",
    "-lead",
    "trail-",
    "a--b",
    "ünïcode",
    "",
    "x".repeat(limits.skillNameMax + 1),
  ])
    expect(skillSchema.safeParse({ ...base, name }).success).toBe(false);
});
it("bounds description and instructions and trims them", () => {
  expect(
    skillSchema.parse({ name: "a", description: " d ", instructions: " i " }),
  ).toEqual({ name: "a", description: "d", instructions: "i" });
  expect(
    skillSchema.safeParse({ name: "a", description: "", instructions: "i" })
      .success,
  ).toBe(false);
  expect(
    skillSchema.safeParse({
      name: "a",
      description: "x".repeat(limits.skillDescriptionMax + 1),
      instructions: "i",
    }).success,
  ).toBe(false);
  expect(
    skillSchema.safeParse({
      name: "a",
      description: "d",
      instructions: "x".repeat(limits.skillInstructionsMax + 1),
    }).success,
  ).toBe(false);
});
it("reads the profile checkbox from form encoding", () => {
  expect(profileSchema.parse({ bio: " Hi ", acceptingClients: "on" })).toEqual({
    bio: "Hi",
    acceptingClients: true,
  });
  expect(profileSchema.parse({ bio: "" })).toEqual({
    bio: "",
    acceptingClients: false,
  });
  expect(
    profileSchema.safeParse({ bio: "x".repeat(limits.bioMax + 1) }).success,
  ).toBe(false);
});
