import { expect, it } from "vitest";
import { portals } from "../lib/auth/portals";
import { magicLink, verifyEmail, resetPassword } from "../lib/email/templates";
for (const [kind, template] of Object.entries({
  magicLink,
  verifyEmail,
  resetPassword,
}))
  for (const portal of Object.values(portals)) {
    it(`${kind}/${portal.key}`, () => {
      const result = template({
        url: "https://holpro.app/link?token=abc&next=home",
        portal,
      });
      expect(result.text).toContain(
        "https://holpro.app/link?token=abc&next=home",
      );
      expect(result.html).toContain("&amp;next=home");
      expect(result).toMatchSnapshot();
    });
  }
it("escapes untrusted HTML in URLs", () =>
  expect(
    magicLink({ url: 'https://holpro.app/"<bad>', portal: portals.coach }).html,
  ).not.toContain('"<bad>'));
