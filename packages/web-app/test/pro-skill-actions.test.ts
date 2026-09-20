import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../lib/auth/gate", () => ({ requirePortalUser: vi.fn() }));
vi.mock("../lib/i18n/request", () => ({ currentLocale: async () => "en" }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("../lib/pro/skills-repository", () => ({
  reservedSkillNames: vi.fn(() => new Set(["plan-guide"])),
  listCoachSkills: vi.fn(async () => []),
  writeCoachSkill: vi.fn(async () => {}),
  removeCoachSkill: vi.fn(async () => {}),
}));
vi.mock("../lib/pro/profile-repository", () => ({
  saveCoachProfile: vi.fn(async () => {}),
}));
import { requirePortalUser } from "../lib/auth/gate";
import { refresh } from "next/cache";
import {
  listCoachSkills,
  writeCoachSkill,
  removeCoachSkill,
} from "../lib/pro/skills-repository";
import { limits } from "../lib/pro/schemas";
import { saveCoachProfile } from "../lib/pro/profile-repository";
import { saveCoachSkill, deleteCoachSkill } from "../lib/pro/skill-actions";
import { updateCoachProfile } from "../lib/pro/profile-actions";
const id = "11111111-1111-4111-8111-111111111111";
const form = (value: Record<string, string>) => {
  const f = new FormData();
  Object.entries(value).forEach(([k, v]) => f.set(k, v));
  return f;
};
const skill = { name: "client-intake", description: "d", instructions: "i" };
const owned = {
  id,
  ...skill,
  name: "existing-skill",
  updatedAt: "2026-09-20T10:00:00.000Z",
};
const stored = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...owned,
    id: `${index}`.padStart(8, "0") + id.slice(8),
    name: `skill-${index}`,
  }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listCoachSkills).mockResolvedValue([owned]);
  vi.mocked(requirePortalUser).mockResolvedValue({
    id: "coach",
    timezone: "UTC",
  } as Awaited<ReturnType<typeof requirePortalUser>>);
});
it("creates a skill and refreshes", async () => {
  expect(await saveCoachSkill({}, form(skill))).toEqual({ ok: true });
  expect(writeCoachSkill).toHaveBeenCalledWith("coach", skill);
  expect(refresh).toHaveBeenCalledOnce();
});
it("returns field errors for invalid names without writing", async () => {
  const state = await saveCoachSkill({}, form({ ...skill, name: "Bad Name" }));
  expect(state.fields?.name?.[0]).toMatch(/lowercase/);
  expect(writeCoachSkill).not.toHaveBeenCalled();
});
it("rejects reserved and duplicate names", async () => {
  const reserved = await saveCoachSkill(
    {},
    form({ ...skill, name: "plan-guide" }),
  );
  expect(reserved.fields?.name?.[0]).toMatch(/built-in/);
  vi.mocked(listCoachSkills).mockResolvedValueOnce([
    { ...owned, id: "other", name: skill.name },
  ]);
  const taken = await saveCoachSkill({}, form(skill));
  expect(taken.fields?.name?.[0]).toMatch(/already/);
  expect(writeCoachSkill).not.toHaveBeenCalled();
});
it("enforces the skill limit only for new skills", async () => {
  vi.mocked(listCoachSkills).mockResolvedValue([
    owned,
    ...stored(limits.skillsMax - 1),
  ]);
  expect(await saveCoachSkill({}, form(skill))).toMatchObject({
    ok: false,
    error: expect.stringContaining(String(limits.skillsMax)),
  });
  expect(await saveCoachSkill({}, form({ ...skill, id }))).toEqual({
    ok: true,
  });
  expect(listCoachSkills).toHaveBeenCalledWith("coach");
});
it("denies edits and deletes of foreign skills", async () => {
  vi.mocked(listCoachSkills).mockResolvedValue([]);
  expect(await saveCoachSkill({}, form({ ...skill, id }))).toMatchObject({
    ok: false,
  });
  expect(await deleteCoachSkill({}, form({ id }))).toMatchObject({
    ok: false,
  });
  expect(writeCoachSkill).not.toHaveBeenCalled();
  expect(removeCoachSkill).not.toHaveBeenCalled();
});
it("deletes owned skills", async () => {
  expect(await deleteCoachSkill({}, form({ id }))).toEqual({ ok: true });
  expect(removeCoachSkill).toHaveBeenCalledWith("coach", id);
});
it("saves the profile and reports database failures", async () => {
  expect(
    await updateCoachProfile({}, form({ bio: "Hi", acceptingClients: "on" })),
  ).toEqual({ ok: true });
  expect(saveCoachProfile).toHaveBeenCalledWith("coach", {
    bio: "Hi",
    acceptingClients: true,
  });
  vi.mocked(saveCoachProfile).mockRejectedValueOnce(Error("db"));
  expect(await updateCoachProfile({}, form({ bio: "" }))).toMatchObject({
    ok: false,
    error: expect.any(String),
  });
});
it("propagates gate redirects", async () => {
  vi.mocked(requirePortalUser).mockRejectedValue(Error("redirect"));
  await expect(saveCoachSkill({}, form(skill))).rejects.toThrow("redirect");
});
