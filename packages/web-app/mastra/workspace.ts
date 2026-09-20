import { existsSync } from "node:fs";
import path from "node:path";
import { Workspace, LocalFilesystem } from "@mastra/core/workspace";
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
export const workspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: resolveSkillsDir(),
    readOnly: true,
  }),
  skills: ["skills"],
  bm25: true,
});
