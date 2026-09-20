import {
  parse,
  parseFragment,
  serialize,
  type DefaultTreeAdapterMap,
} from "parse5";
type Node = DefaultTreeAdapterMap["node"];
const allowed = new Set([
  "html",
  "head",
  "body",
  "title",
  "main",
  "section",
  "article",
  "header",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "div",
  "span",
  "strong",
  "em",
  "b",
  "i",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "caption",
  "br",
  "hr",
  "blockquote",
]);
function clean(parent: Node) {
  if (!("childNodes" in parent)) return;
  parent.childNodes = parent.childNodes.filter(
    (child) => !("tagName" in child) || allowed.has(child.tagName),
  );
  for (const child of parent.childNodes) {
    if ("tagName" in child)
      child.attrs = child.attrs.filter(
        (a) =>
          (a.name === "lang" && /^[a-zA-Z-]{2,12}$/.test(a.value)) ||
          (["colspan", "rowspan"].includes(a.name) &&
            /^\d{1,2}$/.test(a.value)),
      );
    clean(child);
  }
}
const brandStyle =
  '<style>body{margin:0;padding:24px;background:#F5F4EF;color:#1D4533;font:16px/1.55 Manrope,system-ui,sans-serif;overflow-wrap:anywhere}h1,h2,h3,h4,h5,h6{font-family:"Instrument Serif",Georgia,serif;font-weight:400}h1{font-size:clamp(28px,5vw,40px)}section,article{border:1px solid rgba(29,69,51,.18);border-radius:20px;padding:16px;margin-block:16px}table{width:100%;border-collapse:collapse}td,th{padding:8px;text-align:left;border-bottom:1px solid rgba(29,69,51,.18)}p,li{max-width:65ch}</style>';
// Generated intake plans are static documents. Unlike coach-authored artifacts,
// model output cannot add network requests, scripts, forms or event handlers.
export function sanitizeIntakeHtml(html: string) {
  const doc = parse(html);
  clean(doc);
  const root = doc.childNodes.find(
    (n) => n.nodeName === "html",
  ) as DefaultTreeAdapterMap["element"];
  const head = root.childNodes.find(
    (n) => n.nodeName === "head",
  ) as DefaultTreeAdapterMap["element"];
  for (const node of parseFragment(brandStyle).childNodes) {
    node.parentNode = head;
    head.childNodes.push(node);
  }
  return serialize(doc);
}
