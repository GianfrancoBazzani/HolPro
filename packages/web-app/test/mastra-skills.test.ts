import { expect, it, vi } from "vitest";
import { RequestContext } from "@mastra/core/request-context";
vi.mock("../lib/pro/skills-repository", () => ({
  listCoachSkills: vi.fn(async () => [
    {
      id: "s",
      name: "client-intake",
      description: "Use when a new client arrives.",
      instructions: "Ask five questions.",
      updatedAt: "2026-09-20T10:00:00.000Z",
    },
  ]),
}));
import { listCoachSkills } from "../lib/pro/skills-repository";
import { coachSkillsResolver } from "../mastra/skills";
import { toRequestContext, type AssistantContext } from "../mastra/context";
const base: AssistantContext = {
  userId: "u",
  name: "Alex",
  role: "coach",
  locale: "en",
  timezone: "UTC",
  onboarding: false,
  goalsSaved: false,
};
it("loads the coach's skills as inline skills", async () => {
  const skills = await coachSkillsResolver({
    requestContext: toRequestContext(base),
  });
  expect(listCoachSkills).toHaveBeenCalledWith("u");
  expect(skills).toHaveLength(1);
  expect(skills[0]).toMatchObject({
    name: "client-intake",
    description: "Use when a new client arrives.",
    instructions: "Ask five questions.",
    __inline: true,
  });
});
it("gives coachees no coach skills and refuses missing identity", async () => {
  vi.mocked(listCoachSkills).mockClear();
  expect(
    await coachSkillsResolver({
      requestContext: toRequestContext({ ...base, role: "coachee" }),
    }),
  ).toEqual([]);
  expect(listCoachSkills).not.toHaveBeenCalled();
  await expect(
    coachSkillsResolver({ requestContext: new RequestContext() }),
  ).rejects.toThrow("unauthorized");
});
