import { expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const selected = vi.hoisted(() => ({ where: undefined as unknown, joins: 0 }));
vi.mock("@holpro/db", async () => ({
  ...(await import("@holpro/db/schema")),
  db: {
    select: () => {
      const query = {
        from: () => query,
        innerJoin: () => {
          selected.joins++;
          return query;
        },
        where: (condition: unknown) => {
          selected.where = condition;
          return query;
        },
        limit: async () => [],
      };
      return query;
    },
  },
}));
import {
  ownsEngagement,
  ownsEvent,
  ownsItem,
  ownsCheckpoint,
  ownsPeriod,
} from "../lib/pro/ownership";
import type { SQL } from "drizzle-orm";
for (const [check, joins, active] of [
  [ownsEngagement, 0, true],
  [ownsEvent, 0, false],
  [ownsItem, 1, true],
  [ownsCheckpoint, 2, true],
  [ownsPeriod, 2, true],
] as const)
  it(`${check.name} sends ownership predicates to SQL`, async () => {
    selected.joins = 0;
    expect(await check("gated-coach", "target")).toBe(false);
    const q = new MySqlDialect().sqlToQuery(selected.where as SQL);
    expect(q.params).toEqual(
      active ? ["target", "gated-coach", "active"] : ["target", "gated-coach"],
    );
    expect(selected.joins).toBe(joins);
  });
