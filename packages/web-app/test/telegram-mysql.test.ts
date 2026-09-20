import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import mysql from "mysql2/promise";
const url = process.env.TELEGRAM_TEST_DATABASE_URL;
describe.skipIf(!url)(
  "Telegram MySQL transactions (disposable database only)",
  () => {
    let store: typeof import("../lib/telegram/links");
    let connection: mysql.Connection;
    beforeAll(async () => {
      process.env.DATABASE_URL = url;
      connection = await mysql.createConnection(url!);
      const [tables] = await connection.query("SHOW TABLES");
      if ((tables as unknown[]).length)
        throw Error("Integration database must be empty");
      for (const file of (await readdir("../db/drizzle"))
        .filter((f) => f.endsWith(".sql"))
        .sort()) {
        const sql = await readFile(`../db/drizzle/${file}`, "utf8");
        for (const statement of sql.split("--> statement-breakpoint"))
          if (statement.trim()) await connection.query(statement);
      }
      await connection.query(
        "INSERT INTO users (id, full_name, email) VALUES ('u1', 'One', 'one@example.test'), ('u2', 'Two', 'two@example.test')",
      );
      store = await import("../lib/telegram/links");
    });
    afterAll(async () => {
      await connection?.end();
    });
    it("consumes once under concurrent requests and keeps linked rows unchanged", async () => {
      const pending = await store.requestLink("u1", "coach");
      const identity = { userId: 11, chatId: 11, username: null };
      const results = await Promise.all([
        store.consumeLink(pending.token!, identity, async () => {}),
        store.consumeLink(pending.token!, identity, async () => {}),
      ]);
      expect(results.filter((r) => typeof r !== "string")).toHaveLength(1);
      expect(results).toContain("linkInvalid");
      expect((await store.requestLink("u1", "coachee")).link.role).toBe(
        "coach",
      );
      await store.cancelLink("u1", pending.link.id);
      expect((await store.findUserLink("u1"))?.linkedAt).toBeTruthy();
    });
    it("protects the first owner, rolls back cleanup failure, and rejects revoked tokens", async () => {
      const pending = await store.requestLink("u2", "coachee");
      let cleaned = false;
      expect(
        await store.consumeLink(
          pending.token!,
          { userId: 11, chatId: 11, username: null },
          async () => {
            cleaned = true;
          },
        ),
      ).toBe("alreadyLinked");
      expect(cleaned).toBe(false);
      await expect(
        store.consumeLink(
          pending.token!,
          { userId: 22, chatId: 22, username: null },
          async () => {
            throw Error("cleanup");
          },
        ),
      ).rejects.toThrow();
      expect((await store.findUserLink("u2"))?.tokenHash).toBeTruthy();
      await store.revokeLink("u2");
      expect(
        await store.consumeLink(
          pending.token!,
          { userId: 22, chatId: 22, username: null },
          async () => {},
        ),
      ).toBe("linkInvalid");
      expect((await store.requestLink("u2", "coach")).token).toBeUndefined();
      await store.deleteRevokedLink(pending.link.id);
    });
    it("invalidates replaced tokens and leaves new pending requests on stale cancel", async () => {
      const old = await store.requestLink("u2", "coach");
      const next = await store.requestLink("u2", "coachee");
      await store.cancelLink("u2", old.link.id);
      expect((await store.findUserLink("u2"))?.id).toBe(next.link.id);
      expect(
        await store.consumeLink(
          old.token!,
          { userId: 22, chatId: 22, username: null },
          async () => {},
        ),
      ).toBe("linkInvalid");
      await connection.query(
        "UPDATE telegram_links SET token_expires_at = '2000-01-01' WHERE user_id = 'u2'",
      );
      expect(
        await store.consumeLink(
          next.token!,
          { userId: 22, chatId: 22, username: null },
          async () => {},
        ),
      ).toBe("linkInvalid");
    });
  },
);
