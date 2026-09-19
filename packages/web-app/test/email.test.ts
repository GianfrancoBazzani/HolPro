import { expect, it } from "vitest";
import { localeKeys } from "../lib/i18n/config";
import { portals } from "../lib/auth/portals";
import { magicLink, verifyEmail, resetPassword } from "../lib/email/templates";
for (const [kind, template] of Object.entries({
  magicLink,
  verifyEmail,
  resetPassword,
}))
  for (const locale of localeKeys)
    for (const portal of Object.values(portals)) {
      it(`${kind}/${portal.key}/${locale}`, async () => {
        const result = await template({
          locale,
          url: "https://holpro.app/link?token=abc&next=home",
          portal,
        });
        expect(result.html).toContain(`<html lang="${locale}"`);
        expect(result.text).toContain(
          "https://holpro.app/link?token=abc&next=home",
        );
        expect(result.html).toContain("&amp;next=home");
        expect(result).toMatchSnapshot();
      });
    }
it("escapes untrusted HTML in URLs", async () =>
  expect(
    (
      await magicLink({
        url: 'https://holpro.app/"<bad>',
        portal: portals.coach,
        locale: "es",
      })
    ).html,
  ).not.toContain('"<bad>'));
