import { expect, it } from "vitest";
import { sanitizeIntakeHtml } from "../lib/onboarding/html";
it("preserves plan content while removing executable or external content", () => {
  const html = sanitizeIntakeHtml(
    '<html lang="it"><head><style>@import "https://evil.test";</style></head><body onload="steal()"><h1>Piano</h1><p style="background:url(https://evil.test)">Cammina</p><script>steal()</script><img src="https://evil.test"><a href="https://evil.test">Link</a><svg onload="steal()"></svg></body></html>',
  );
  expect(html).toContain("<h1>Piano</h1>");
  expect(html).toContain("<p>Cammina</p>");
  expect(html).not.toMatch(/evil|steal|onload|<script|<svg|<img/);
  expect(html).toContain('lang="it"');
});
