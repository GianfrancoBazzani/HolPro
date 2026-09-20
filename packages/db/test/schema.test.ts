import { describe, it, expect } from "vitest";
import {
  readdirSync,
  readFileSync,
  mkdtempSync,
  cpSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
const migrations = resolve("drizzle");
describe("migration contract", () => {
  it("preserves checks, uniqueness, history and auth storage", () => {
    const sql = readdirSync(migrations)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join(migrations, f), "utf8"))
      .join("\n");
    expect(sql).toMatch(/CHECK.*pending.*active.*suspended/i);
    expect(sql).toMatch(/CHECK.*active.*ended/i);
    expect(sql).toMatch(
      /CHECK.*training.*nutrition.*supplementation.*mindset.*habits.*health.*other/i,
    );
    expect(sql).toMatch(/CHECK.*planned.*done.*skipped/i);
    expect(sql).toMatch(/CHECK.*end_date.*>=.*start_date/i);
    expect(sql).toMatch(/CHECK.*'call'.*'event'/i);
    expect(sql).toMatch(/CHECK.*duration_minutes.*between 5 and 1440/i);
    expect(sql.match(/ON DELETE set null/gi)).toHaveLength(1);
    expect(sql.match(/ON DELETE restrict/gi)).toHaveLength(6);
    expect(sql).toMatch(/UNIQUE\(`document_id`,`number`\)/);
    expect(sql).toContain("CREATE TABLE `plan_document_drafts`");
    expect(sql).toContain("CREATE TABLE `plan_change_drafts`");
    expect(sql).toContain("plan_change_drafts_engagement_uidx");
    expect(sql).toMatch(
      /plan_document_drafts_document_uidx.*UNIQUE\(`document_id`\)/,
    );
    expect(sql).toMatch(/CHECK.*`number` > 0/);
    expect(sql).toContain("`html` mediumtext NOT NULL");
    expect(sql.match(/ON DELETE cascade/gi)?.length).toBeGreaterThanOrEqual(10);
    expect(sql).toMatch(/UNIQUE.*email/i);
    expect(sql).toMatch(/UNIQUE.*token/i);
    expect(sql).toContain("rate_limits");
    expect(sql).toMatch(/locale.*varchar\(12\).*DEFAULT 'en'.*NOT NULL/i);
    expect(sql).toMatch(/updated_at.*ON UPDATE CURRENT_TIMESTAMP\(3\)/i);
    expect(sql).toMatch(/CREATE TABLE `coach_skills`/);
    expect(sql).toMatch(/coach_skills_coach_name_idx/);
  });
  it("has no schema drift", () => {
    const temp = mkdtempSync(join(tmpdir(), "holpro-drift-"));
    try {
      cpSync(migrations, temp, { recursive: true });
      const before = readdirSync(temp).filter((f) => f.endsWith(".sql"));
      execFileSync(
        "pnpm",
        [
          "exec",
          "drizzle-kit",
          "generate",
          "--dialect=mysql",
          "--schema=./src/schema/index.ts",
          `--out=${temp}`,
        ],
        { stdio: "pipe" },
      );
      expect(readdirSync(temp).filter((f) => f.endsWith(".sql"))).toEqual(
        before,
      );
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  }, 30000);
});
