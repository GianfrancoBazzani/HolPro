import { beforeEach, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const storage = vi.hoisted(() => ({
  results: [] as unknown[][],
  where: [] as unknown[],
}));
vi.mock("@holpro/db", async () => ({
  ...(await import("@holpro/db/schema")),
  db: {
    select: () => {
      const q = {
        from: () => q,
        innerJoin: () => q,
        where: (condition: unknown) => {
          storage.where.push(condition);
          return q;
        },
        orderBy: () => q,
        limit: async () => storage.results.shift() ?? [],
        then: (resolve: (value: unknown) => void) =>
          resolve(storage.results.shift() ?? []),
      };
      return q;
    },
  },
}));
import { searchCoaches, escapeLike } from "../lib/coaches/repository";
const dialect = new MySqlDialect();
beforeEach(() => {
  storage.results = [];
  storage.where = [];
});
it("escapes LIKE wildcards and the escape character", () => {
  expect(escapeLike("50%_x\\")).toBe("50\\%\\_x\\\\");
  expect(escapeLike("plain")).toBe("plain");
});
it("returns accepting active coaches with grouped specialties", async () => {
  storage.results = [
    [
      { coachId: "a", name: "Ana", bio: null },
      { coachId: "b", name: "Bo", bio: "Strength" },
    ],
    [
      { coachId: "b", specialty: "strength" },
      { coachId: "b", specialty: "nutrition" },
    ],
  ];
  expect(await searchCoaches()).toEqual([
    { coachId: "a", name: "Ana", bio: "", specialties: [] },
    {
      coachId: "b",
      name: "Bo",
      bio: "Strength",
      specialties: ["strength", "nutrition"],
    },
  ]);
  const params = dialect.sqlToQuery(storage.where[0] as never).params;
  expect(params).toEqual([true, "active"]);
});
it("matches name, bio and specialties with an escaped pattern", async () => {
  storage.results = [[]];
  expect(await searchCoaches(" 100% ")).toEqual([]);
  // The exists() subquery records its own condition (one LIKE on specialty);
  // the outer condition holds the name and bio LIKEs and the status filters.
  const params = storage.where.flatMap(
    (condition) => dialect.sqlToQuery(condition as never).params,
  );
  expect(params.filter((p) => p === "%100\\%%")).toHaveLength(3);
  expect(params).toContain(true);
  expect(params).toContain("active");
  expect(storage.where).toHaveLength(2);
});
