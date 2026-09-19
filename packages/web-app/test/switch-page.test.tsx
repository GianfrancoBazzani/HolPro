import { beforeEach, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ gate: vi.fn(), signOut: vi.fn() }));
vi.mock("../lib/auth/gate", () => ({ requirePortalUser: mocks.gate }));
vi.mock("../lib/auth/actions", () => ({ signOut: mocks.signOut }));
vi.mock("../lib/i18n/actions", () => ({ chooseLocale: vi.fn() }));
vi.mock("../components/auth/forms", () => ({
  LoginForm: () => null,
  ResetForm: () => null,
  WelcomeForm: () => null,
}));
import { SwitchPage } from "../components/auth/pages";
import { getDictionary } from "../lib/i18n/dictionary";
import { localeKeys } from "../lib/i18n/config";
import { otherPortal, portals } from "../lib/auth/portals";
beforeEach(() => vi.clearAllMocks());
for (const locale of localeKeys)
  for (const portal of Object.values(portals))
    it(`offers the other area on ${portal.key}/${locale}`, async () => {
      mocks.gate.mockResolvedValue({ email: "jo@example.com", name: "Jo" });
      const html = renderToStaticMarkup(
        await SwitchPage({
          portal,
          params: Promise.resolve({ lang: locale }),
          searchParams: Promise.resolve({}),
        }),
      );
      const auth = (await getDictionary(locale)).auth;
      const content = html.replaceAll("&#x27;", "'");
      expect(mocks.gate).toHaveBeenCalledWith(portal, "switch");
      expect(content).toContain(
        auth[`switch.body.${portal.key}`].replace("{email}", "jo@example.com"),
      );
      expect(content).toContain(auth[`switch.title.${portal.key}`]);
      expect(html).toContain(`href="${otherPortal(portal).homePath}"`);
      expect(content).toContain(auth[`switch.go.${portal.key}`]);
      expect(content).toContain(auth["switch.signout"]);
      expect(html).toContain('class="button-group"');
      expect(mocks.signOut).not.toHaveBeenCalled();
    });
