import {
  parse,
  parseFragment,
  serialize,
  type DefaultTreeAdapterMap,
} from "parse5";
type Node = DefaultTreeAdapterMap["node"];
export const planCsp =
  "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src https: data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";
const reporter = `(()=>{let last=0,queued=false;const report=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const value=document.documentElement.scrollHeight;if(value!==last){last=value;parent.postMessage({type:"holpro:height",value},"*");}});};addEventListener("load",()=>{report();if(typeof ResizeObserver!=="undefined")new ResizeObserver(report).observe(document.documentElement);});})();`;
function stripNavigation(node: Node) {
  if ("childNodes" in node) {
    node.childNodes = node.childNodes.filter(
      (child) =>
        !(
          "tagName" in child &&
          (child.tagName === "base" ||
            (child.tagName === "meta" &&
              child.attrs.some(
                (a) =>
                  a.name === "http-equiv" &&
                  a.value.trim().toLowerCase() === "refresh",
              )))
        ),
    );
    node.childNodes.forEach(stripNavigation);
  }
  if ("tagName" in node && node.tagName === "template")
    stripNavigation((node as DefaultTreeAdapterMap["template"]).content);
}
export function framePlanHtml(html: string) {
  const document = parse(html);
  stripNavigation(document);
  document.childNodes = document.childNodes.filter(
    (node) => node.nodeName !== "#documentType",
  );
  const root = document.childNodes.find(
    (node) => node.nodeName === "html",
  ) as DefaultTreeAdapterMap["element"];
  const head = root.childNodes.find(
    (node) => node.nodeName === "head",
  ) as DefaultTreeAdapterMap["element"];
  const prefix = parseFragment(
    `<meta http-equiv="Content-Security-Policy" content="${planCsp}"><script>${reporter}</script>`,
  ).childNodes;
  prefix.forEach((node) => {
    node.parentNode = head;
  });
  head.childNodes.unshift(...prefix);
  return `<!DOCTYPE html>${serialize(document)}`;
}
