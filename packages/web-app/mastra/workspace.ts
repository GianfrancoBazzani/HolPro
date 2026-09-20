import { Workspace, LocalFilesystem } from "@mastra/core/workspace";
import { resolveSkillsDir } from "@/lib/assistant/skills-dir";
export const workspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: resolveSkillsDir(),
    readOnly: true,
  }),
  skills: ["skills"],
  bm25: true,
});
