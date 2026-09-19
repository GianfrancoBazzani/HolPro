import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  deliver: vi.fn(),
  load: vi.fn(),
  options: undefined as unknown,
  magic: undefined as unknown,
}));
vi.mock("better-auth", () => ({
  betterAuth: (options: unknown) => {
    mocks.options = options;
    return {};
  },
}));
vi.mock("better-auth/plugins", () => ({
  magicLink: (options: unknown) => {
    mocks.magic = options;
    return {};
  },
}));
vi.mock("better-auth/next-js", () => ({ nextCookies: () => ({}) }));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: () => ({}) }));
vi.mock("@holpro/db", () => ({ db: {}, schema: {} }));
vi.mock("../lib/auth/repository", () => ({
  loadUserLocaleByEmail: mocks.load,
  activateVerifiedUser: vi.fn(),
  loadUserStatus: vi.fn(),
}));
vi.mock("../lib/email/resend", () => ({ deliverAuthEmail: mocks.deliver }));
import "../lib/auth/server";
type EmailCallback = (
  data: { user: { email: string; locale?: string }; url: string },
  request?: Request,
) => Promise<void>;
const options = () =>
  mocks.options as {
    user: { additionalFields: { locale: unknown } };
    emailVerification: { sendVerificationEmail: EmailCallback };
    emailAndPassword: { sendResetPassword: EmailCallback };
  };
const url = "http://localhost:3000/api/auth/verify?callbackURL=/pro";
beforeEach(() => {
  mocks.deliver.mockReset();
  mocks.load.mockReset();
});
it("does not accept client-supplied profile locales", () => {
  expect(options().user.additionalFields.locale).toEqual({
    type: "string",
    defaultValue: "en",
    input: false,
  });
});
it.each(["verify", "reset"])(
  "localizes %s using request before profile, then default",
  async (kind) => {
    const callback =
      kind === "verify"
        ? options().emailVerification.sendVerificationEmail
        : options().emailAndPassword.sendResetPassword;
    for (const [requestLocale, stored, expected] of [
      ["es", "en", "es"],
      ["xx-unsupported", "es", "es"],
      ["xx-unsupported", "unsupported", "en"],
    ]) {
      await callback(
        { user: { email: "test@example.com", locale: stored }, url },
        new Request(url, { headers: { "accept-language": requestLocale } }),
      );
      expect(mocks.deliver.mock.lastCall?.[0].html).toContain(
        `<html lang="${expected}"`,
      );
    }
    expect(mocks.load).not.toHaveBeenCalled();
  },
);
it("magic-link callback loads stored locale only without request preference", async () => {
  const callback = (
    mocks.magic as {
      sendMagicLink: (
        data: { email: string; url: string },
        ctx?: { request?: Request },
      ) => Promise<void>;
    }
  ).sendMagicLink;
  mocks.load.mockResolvedValue("es");
  await callback({ email: "test@example.com", url });
  expect(mocks.load).toHaveBeenCalledWith("test@example.com");
  expect(mocks.deliver.mock.lastCall?.[0].html).toContain('<html lang="es"');
  mocks.load.mockClear();
  await callback(
    { email: "test@example.com", url },
    {
      request: new Request(url, {
        headers: { cookie: "hp_seen=en", "accept-language": "es" },
      }),
    },
  );
  expect(mocks.load).not.toHaveBeenCalled();
  expect(mocks.deliver.mock.lastCall?.[0].html).toContain('<html lang="en"');
});
