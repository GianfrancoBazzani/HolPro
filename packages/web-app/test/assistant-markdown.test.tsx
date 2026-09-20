import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { toPlainText } from "../lib/assistant/plain-text";
import { Markdown } from "../components/assistant/markdown";

const sample = [
  "The tools are:",
  "",
  "- **Get your plan** — view your plan.",
  "- **Save goals** — record goals.",
  "",
  "```js",
  "const total = 1;",
  "```",
  "",
  "See [the plan](https://example.com/plan).",
].join("\n");

it("renders bold, lists, highlighted code and safe links", () => {
  const html = renderToStaticMarkup(<Markdown text={sample} />);
  expect(html).toContain("<strong>Get your plan</strong>");
  expect(html).toContain("<li>");
  expect(html).toContain('class="hljs language-js"');
  expect(html).toContain('class="hljs-keyword">const</span>');
  expect(html).toContain(
    '<a href="https://example.com/plan" target="_blank" rel="noopener noreferrer">the plan</a>',
  );
});

it("does not render raw HTML", () => {
  const html = renderToStaticMarkup(
    <Markdown text={'Hi <img src=x onerror="alert(1)">'} />,
  );
  expect(html).not.toContain("<img");
});


it("strips Markdown syntax for speech", () => {
  const text = [
    "## Plan",
    "",
    "- **Get your plan** — view it.",
    "1. Run `pnpm test`.",
    "",
    "```js",
    "const a = 1;",
    "```",
    "",
    "> Note",
    "",
    "See [the plan](https://example.com).",
  ].join("\n");
  expect(toPlainText(text)).toBe(
    [
      "Plan",
      "Get your plan — view it.",
      "Run pnpm test.",
      "Note",
      "See the plan.",
    ].join("\n"),
  );
});
 it("handles GFM and fenced code consistently for speech", () => {
   expect(toPlainText("~~Old~~ **New**\n\n~~~ts\nconst hidden = 1;\n~~~\n\n[Read][r]\n\n[r]: https://example.com")).toBe("Old New\nRead");
   expect(toPlainText("Keep snake_case and a_b_c.\n\n```ts\nunfinished code")).toBe("Keep snake_case and a_b_c.");
 });
 it("rejects executable links and renders GFM tables", () => {
   const html = renderToStaticMarkup(<Markdown text={"[bad](javascript:alert%281%29)\n\n| A | B |\n|---|---|\n| 1 | 2 |"} />);
   expect(html).not.toContain('href="javascript:');
   expect(html).toContain("<table>");
 });
