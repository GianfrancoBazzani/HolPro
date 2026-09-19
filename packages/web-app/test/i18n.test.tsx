import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { hasLocale, localeKeys } from "../lib/i18n/config";
import {
  parseAcceptLanguage,
  matchLocale,
  resolveLocale,
} from "../lib/i18n/negotiate";
import { splitLocale, localePath, isMarketingPath } from "../lib/i18n/routes";
import { format } from "../lib/i18n/format";
import { getDictionary } from "../lib/i18n/dictionary";
import { Rich } from "../components/i18n/rich";
import { I18nProvider, useT, useLocale } from "../components/i18n/provider";
it("negotiates quality weights, regions and unsupported preferences", () => {
  expect(parseAcceptLanguage("fr, en;q=0.4, es-MX;q=0.9")).toEqual([
    "fr",
    "es-MX",
    "en",
  ]);
  expect(parseAcceptLanguage("es;q=0,en;q=oops,fr;q=2")).toEqual([]);
  expect(parseAcceptLanguage("")).toEqual([]);
  expect(matchLocale(["xx-unsupported", "es-MX", "en"])).toBe("es");
  expect(matchLocale(["xx-unsupported", "*"])).toBeUndefined();
  expect(matchLocale(["EN-us"])).toBe("en");
  for (const value of [
    "constructor",
    "__proto__",
    "toString",
    "xx-unsupported",
  ])
    expect(hasLocale(value)).toBe(false);
});
it("resolves explicit choice before seen, header and default", () => {
  const signals = (cookie: string, acceptLanguage?: string) =>
    new Headers({
      cookie,
      ...(acceptLanguage && { "accept-language": acceptLanguage }),
    });
  expect(resolveLocale(signals("hp_locale=en; hp_seen=es", "es"))).toBe("en");
  expect(resolveLocale(signals("hp_locale=bad; hp_seen=es", "en"))).toBe("es");
  expect(resolveLocale(signals("", "es-ES"))).toBe("es");
  expect(resolveLocale(new Headers())).toBe("en");
});
it("builds public paths without prefixing product URLs", () => {
  expect(splitLocale("/es/login")).toEqual({ locale: "es", path: "/login" });
  expect(splitLocale("/es")).toEqual({ locale: "es", path: "/" });
  expect(splitLocale("/unsupported-path")).toEqual({
    path: "/unsupported-path",
  });
  expect(localePath("en", "/")).toBe("/");
  expect(localePath("es", "/")).toBe("/es");
  expect(localePath("es", "/pro/login")).toBe("/pro/login");
  expect(isMarketingPath("/")).toBe(true);
  expect(isMarketingPath("/login")).toBe(false);
});
it("formats values without interpreting inserted placeholders", () => {
  expect(format("Hello {name}, {count}", { name: "{count}", count: 2 })).toBe(
    "Hello {count}, 2",
  );
  expect(() => format("{name}")).toThrow("name");
  expect(() => format("{toString}")).toThrow("toString");
});
it("renders only emphasis as markup", () => {
  expect(renderToStaticMarkup(<Rich text="Hello <em>world</em>" />)).toBe(
    "Hello <em>world</em>",
  );
  expect(renderToStaticMarkup(<Rich text="<script>bad</script>" />)).toBe(
    "&lt;script&gt;bad&lt;/script&gt;",
  );
  expect(renderToStaticMarkup(<Rich text="Plain" />)).toBe("Plain");
});
describe("dictionary parity", () => {
  for (const locale of localeKeys)
    it(locale, async () => {
      const source = await getDictionary("en");
      const translated = await getDictionary(locale);
      expect(Object.keys(translated)).toEqual(Object.keys(source));
      for (const namespace of Object.keys(source) as (keyof typeof source)[]) {
        expect(Object.keys(translated[namespace])).toEqual(
          Object.keys(source[namespace]),
        );
        for (const [key, value] of Object.entries(source[namespace])) {
          const target = (translated[namespace] as Record<string, string>)[key];
          expect(target.trim(), `${namespace}.${key}`).not.toBe("");
          expect(target.match(/\{\w+\}/g)?.sort() ?? []).toEqual(
            value.match(/\{\w+\}/g)?.sort() ?? [],
          );
          expect(target.match(/<em>/g)?.length ?? 0).toBe(
            value.match(/<em>/g)?.length ?? 0,
          );
          expect((target.match(/<em>/g) ?? []).length).toBeLessThanOrEqual(1);
          expect(target.replace(/<\/?em>/g, "")).not.toMatch(/<[^>]+>/);
        }
      }
    });
});
it("merges nested namespaces without losing locale", async () => {
  const d = await getDictionary("es");
  function Child() {
    const t = useT("common");
    const a = useT("auth");
    return (
      <p>
        {useLocale()} {t("skip")} {a("login.body")}
      </p>
    );
  }
  const html = renderToStaticMarkup(
    <I18nProvider locale="es" messages={{ common: d.common }}>
      <I18nProvider locale="es" messages={{ auth: d.auth }}>
        <Child />
      </I18nProvider>
    </I18nProvider>,
  );
  expect(html).toContain(d.common.skip);
  expect(html).toContain(d.auth["login.body"]);
});
