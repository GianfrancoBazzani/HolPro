import { expect, it } from "vitest";
import { parse, type DefaultTreeAdapterMap } from "parse5";
import { framePlanHtml } from "../lib/plans/frame";
it.each([
  "<!doctype html><html><head><title>Plan</title><script>window.original=true</script></head><body><h1>Focus</h1></body></html>",
  "<html><body><h1>Focus</h1></body></html>",
  "<h1>Focus</h1>",
  "<!-- <head>fake</head> --><script>window.original=true</script><h1>Focus</h1>",
])("places CSP and reporter before untrusted code: %s", (html) => {
  const framed = framePlanHtml(html),
    doc = parse(framed);
  expect(framed).toMatch(/^<!DOCTYPE html>/i);
  expect(doc.mode).toBe("no-quirks");
  const root = doc.childNodes.find(
    (n) => n.nodeName === "html",
  ) as DefaultTreeAdapterMap["element"];
  const head = root.childNodes.find(
    (n) => n.nodeName === "head",
  ) as DefaultTreeAdapterMap["element"];
  expect(head.childNodes[0].nodeName).toBe("meta");
  expect(
    (head.childNodes[0] as DefaultTreeAdapterMap["element"]).attrs,
  ).toContainEqual({ name: "http-equiv", value: "Content-Security-Policy" });
  expect(head.childNodes[1].nodeName).toBe("script");
  expect(framed).toContain("<h1>Focus</h1>");
});
it("removes base and refresh from documents and templates", () => {
  const framed = framePlanHtml(
    '<base href="https://evil.test"><template><meta http-equiv="Refresh" content="0;url=https://evil.test"></template><p>Plan</p>',
  );
  expect(framed).not.toContain("evil.test");
  expect(framed).toContain("<p>Plan</p>");
});
