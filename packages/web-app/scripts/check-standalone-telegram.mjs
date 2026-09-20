import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

// Keep the artifact outside the repository so missing packages cannot resolve
// from the development node_modules and hide a broken container deployment.
const directory = await mkdtemp(path.join(tmpdir(), "holpro-telegram-"));
try {
  await cp(new URL("../.next/standalone/", import.meta.url), directory, {
    recursive: true,
  });
  const require = createRequire(
    path.join(directory, "packages/web-app/package.json"),
  );
  const probe = path.join(
    path.dirname(require.resolve("@mastra/core/channels")),
    "telegram-smoke.mjs",
  );
  // Resolve from Mastra's location, exactly as its lazy channel import does.
  await writeFile(
    probe,
    `import assert from "node:assert/strict";
const { Chat, Message, ConsoleLogger } = await import("chat");
assert.equal(typeof Chat, "function");
assert.equal(typeof Message, "function");
assert.equal(typeof ConsoleLogger, "function");
console.log("Standalone Telegram dependencies loaded successfully.");
`,
  );
  const result = spawnSync(process.execPath, [probe], {
    cwd: directory,
    stdio: "inherit",
    env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
