import { existsSync } from "node:fs";
import path from "node:path";
// The workspace lives next to the app in development and under
// packages/web-app in the Docker runtime. ASSISTANT_SKILLS_DIR overrides both.
export function resolveSkillsDir() {
  const override = process.env.ASSISTANT_SKILLS_DIR;
  const candidates = override
    ? [override]
    : [
        path.join(process.cwd(), "mastra/workspace"),
        path.join(process.cwd(), "packages/web-app/mastra/workspace"),
      ];
  const directory = candidates.find((p) => existsSync(path.join(p, "skills")));
  if (!directory) throw new Error("Assistant skills directory not found");
  return directory;
}
