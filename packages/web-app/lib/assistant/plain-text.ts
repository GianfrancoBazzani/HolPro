import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

const parser = unified().use(remarkParse).use(remarkGfm);
type TextNode = {
  type: string;
  value?: string;
  alt?: string | null;
  children?: TextNode[];
};

// Use the renderer's grammar so formatting and links are spoken as words.
export function toPlainText(markdown: string): string {
  function read(node: TextNode): string {
    if (["code", "html", "definition"].includes(node.type)) return "";
    if (node.type === "text" || node.type === "inlineCode") return node.value ?? "";
    if (node.type === "image" || node.type === "imageReference") return node.alt ?? "";
    if (node.type === "break") return "\n";
    const separator = ["root", "blockquote", "list", "listItem", "table"].includes(node.type)
      ? "\n"
      : node.type === "tableRow" ? " " : "";
    return (node.children ?? []).map(read).filter(Boolean).join(separator);
  }
  return read(parser.parse(markdown))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
