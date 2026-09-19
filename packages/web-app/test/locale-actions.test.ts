import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  delete: vi.fn(),
  session: vi.fn(),
  update: vi.fn(),
  headers: new Headers(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.set, delete: mocks.delete }),
  headers: async () => mocks.headers,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("../lib/auth/server", () => ({
  auth: { api: { getSession: mocks.session } },
}));
vi.mock("../lib/auth/repository", () => ({ updateUserLocale: mocks.update }));
import { chooseLocale } from "../lib/i18n/actions";
import { preferredLocale } from "../lib/i18n/negotiate";
const form = (data: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.set(k, v);
  return f;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.headers = new Headers();
});
it("persists an explicit supported choice and clears seen language", async () => {
  mocks.session.mockResolvedValue({ user: { id: "u" } });
  await expect(
    chooseLocale(form({ locale: "es", next: "/es" })),
  ).rejects.toThrow("REDIRECT:/es");
  expect(mocks.set).toHaveBeenCalledWith(
    "hp_locale",
    "es",
    expect.objectContaining({
      path: "/",
      sameSite: "lax",
      maxAge: 31536000,
      httpOnly: false,
    }),
  );
  expect(mocks.delete).toHaveBeenCalledWith("hp_seen");
  expect(mocks.update).toHaveBeenCalledWith("u", "es");
});
it("ignores unsupported and prototype locales", async () => {
  for (const locale of ["xx-unsupported", "constructor", "__proto__"])
    await chooseLocale(form({ locale }));
  expect(mocks.set).not.toHaveBeenCalled();
  expect(mocks.session).not.toHaveBeenCalled();
});
it.each([
  "//evil.test",
  "/\\evil.test",
  "https://evil.test/a",
  "/%2f%2fevil.test",
  "/%5cevil.test",
  "/es//evil.test",
  "/en//evil.test",
  "/es/..//evil.test",
  "/x/..//evil.test",
  "/%2e%2e//evil.test",
])("rejects unsafe next %s", async (next) => {
  await expect(chooseLocale(form({ locale: "es", next }))).rejects.toThrow(
    /^REDIRECT:\/$/,
  );
});
it("accepts same-origin referer and strips internal product prefixes", async () => {
  mocks.headers.set("referer", "http://localhost:3000/es/login/reset?token=x");
  await expect(chooseLocale(form({ locale: "es" }))).rejects.toThrow(
    "REDIRECT:/login/reset?token=x",
  );
  await expect(
    chooseLocale(form({ locale: "es", next: "/en/pro/login?error=x" })),
  ).rejects.toThrow("REDIRECT:/pro/login?error=x");
  mocks.headers.set("referer", "https://evil.test/login");
  await expect(chooseLocale(form({ locale: "es" }))).rejects.toThrow(
    /^REDIRECT:\/$/,
  );
});
it("request signals leave room for stored email locale fallback", () => {
  expect(
    preferredLocale(new Headers({ "accept-language": "xx-unsupported" })),
  ).toBeUndefined();
  expect(
    preferredLocale(
      new Headers({
        cookie: "hp_locale=es; hp_seen=en",
        "accept-language": "en",
      }),
    ),
  ).toBe("es");
});
