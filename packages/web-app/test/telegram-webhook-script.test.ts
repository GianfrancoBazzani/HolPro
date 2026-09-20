import { execFileSync, spawnSync } from "node:child_process";
import { expect, it } from "vitest";
it("dry-runs without network or disclosing secrets", () => {
  const output = execFileSync(
    process.execPath,
    [
      "scripts/telegram-set-webhook.mjs",
      "--url",
      "https://example.test/api/telegram/webhook",
      "--dry-run",
    ],
    {
      env: {
        ...process.env,
        TELEGRAM_BOT_TOKEN: "private-token",
        TELEGRAM_WEBHOOK_SECRET_TOKEN: "private-secret",
      },
      encoding: "utf8",
    },
  );
  expect(output).toContain("message");
  expect(output).not.toContain("private-token");
  expect(output).not.toContain("private-secret");
});
it("rejects invalid configuration without disclosing a token", () => {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/telegram-set-webhook.mjs",
      "--url",
      "http://example.test",
      "--dry-run",
    ],
    { encoding: "utf8" },
  );
  expect(result.status).toBe(1);
});
