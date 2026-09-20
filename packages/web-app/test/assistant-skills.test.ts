import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { resolveSkillsDir } from "../mastra/workspace";
it("ships four discoverable skills", () => {
  const root = resolveSkillsDir();
  const skills = readdirSync(`${root}/skills`);
  expect(skills).toHaveLength(4);
  for (const name of skills) {
    const content = readFileSync(`${root}/skills/${name}/SKILL.md`, "utf8");
    expect(content).toMatch(new RegExp(`name: ${name}\\n`));
    expect(content).toMatch(/description: .+/);
  }
});
