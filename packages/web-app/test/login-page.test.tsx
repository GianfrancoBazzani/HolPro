import { it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../lib/auth/gate", () => ({ requirePortalUser: vi.fn() }));
vi.mock("../lib/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("../components/auth/forms", () => ({
  LoginForm: () => null,
  ResetForm: () => null,
  WelcomeForm: () => null,
}));
import { LoginPage } from "../components/auth/pages";
import { portals } from "../lib/auth/portals";
for (const portal of Object.values(portals))
  it(`shows direct magic-link error for ${portal.key}`, async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        portal,
        searchParams: Promise.resolve({ error: "INVALID_TOKEN" }),
      }),
    );
    expect(html).toContain(
      "This link is invalid or expired. Request a new one.",
    );
  });
it.each(["__proto__", "constructor", "unknown"])(
  "drops unknown error %s",
  async (error) => {
    const html = renderToStaticMarkup(
      await LoginPage({
        portal: portals.coachee,
        searchParams: Promise.resolve({ error }),
      }),
    );
    expect(html).not.toContain('role="alert"');
  },
);
