import { beforeEach, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const storage = vi.hoisted(() => ({
  rows: [] as unknown[],
  where: [] as unknown[],
  writes: [] as unknown[],
}));
vi.mock("@holpro/db", async () => ({
  ...(await import("@holpro/db/schema")),
  db: {
    select: () => {
      const q = {
        from: () => q,
        where: (condition: unknown) => {
          storage.where.push(condition);
          return q;
        },
        orderBy: async () => storage.rows,
        limit: async () => storage.rows,
        then: (resolve: (value: unknown) => void) => resolve(storage.rows),
      };
      return q;
    },
    insert: () => ({
      values: async (value: unknown) => {
        storage.writes.push(value);
      },
    }),
    update: () => ({
      set: (value: unknown) => ({
        where: async (condition: unknown) => {
          storage.where.push(condition);
          storage.writes.push(value);
        },
      }),
    }),
    delete: () => ({
      where: async (condition: unknown) => {
        storage.where.push(condition);
        storage.writes.push("delete");
      },
    }),
  },
}));
import {
  reservedSkillNames,
  listCoachSkills,
  writeCoachSkill,
  removeCoachSkill,
} from "../lib/pro/skills-repository";
import { saveCoachProfile } from "../lib/pro/profile-repository";
import { coachProfile } from "../lib/pro/profile";
const dialect = new MySqlDialect();
const params = (index: number) =>
  dialect.sqlToQuery(storage.where[index] as never).params;
beforeEach(() => {
  storage.rows = [];
  storage.where = [];
  storage.writes = [];
});
it("reserves the built-in workspace skill names", () => {
  const names = reservedSkillNames();
  expect(names.has("plan-guide")).toBe(true);
  expect(names.has("coachee-onboarding")).toBe(true);
  expect(names.has("my-own-skill")).toBe(false);
});
it("lists the coach's skills sorted with ISO timestamps", async () => {
  storage.rows = [
    {
      id: "s",
      coachId: "coach",
      name: "intake",
      description: "d",
      instructions: "i",
      createdAt: new Date("2026-09-20T10:00:00Z"),
      updatedAt: new Date("2026-09-20T11:00:00Z"),
    },
  ];
  expect(await listCoachSkills("coach")).toEqual([
    {
      id: "s",
      name: "intake",
      description: "d",
      instructions: "i",
      updatedAt: "2026-09-20T11:00:00.000Z",
    },
  ]);
  expect(params(0)).toEqual(["coach"]);
});
it("inserts new skills and updates owned ones", async () => {
  await writeCoachSkill("coach", {
    name: "intake",
    description: "d",
    instructions: "i",
  });
  expect(storage.writes[0]).toMatchObject({
    coachId: "coach",
    name: "intake",
    description: "d",
    instructions: "i",
  });
  await writeCoachSkill("coach", {
    id: "s",
    name: "intake",
    description: "d2",
    instructions: "i2",
  });
  expect(storage.writes[1]).toEqual({
    name: "intake",
    description: "d2",
    instructions: "i2",
  });
  expect(params(0)).toEqual(["s", "coach"]);
  await removeCoachSkill("coach", "s");
  expect(storage.writes[2]).toBe("delete");
  expect(params(1)).toEqual(["s", "coach"]);
});
it("stores an empty bio as null and maps the profile", async () => {
  await saveCoachProfile("coach", { bio: "", acceptingClients: false });
  expect(storage.writes[0]).toEqual({ bio: null, acceptingClients: false });
  expect(params(0)).toEqual(["coach"]);
  expect(coachProfile({ coach: { bio: null, acceptingClients: true } })).toEqual(
    { bio: "", acceptingClients: true },
  );
  expect(coachProfile({ coach: null })).toBeUndefined();
  expect(coachProfile({})).toBeUndefined();
});
