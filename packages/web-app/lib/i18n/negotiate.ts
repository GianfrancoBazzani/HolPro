import { parseCookies } from "better-auth/cookies";
import {
  defaultLocale,
  hasLocale,
  localeCookie,
  seenCookie,
  type Locale,
} from "./config";
export function parseAcceptLanguage(
  header: string | null | undefined,
): string[] {
  return (header ?? "")
    .split(",")
    .map((entry, index) => {
      const [language, ...params] = entry.trim().split(";");
      const weight = params.find((p) => /^\s*q\s*=/i.test(p));
      const raw = weight?.split("=")[1]?.trim();
      const q =
        raw === undefined
          ? 1
          : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(raw)
            ? Number(raw)
            : 0;
      return { language, q, index };
    })
    .filter(
      ({ language, q }) =>
        /^[a-z]{1,8}(?:-[a-z0-9]{1,8})*$/i.test(language) && q > 0,
    )
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ language }) => language);
}
export function matchLocale(languages: readonly string[]): Locale | undefined {
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (hasLocale(base)) return base;
  }
}
// Explicit choice, then seen marketing language, then Accept-Language.
export function preferredLocale(headers: Headers): Locale | undefined {
  const cookies = parseCookies(headers.get("cookie") ?? "");
  const chosen = cookies.get(localeCookie);
  const seen = cookies.get(seenCookie);
  return hasLocale(chosen)
    ? chosen
    : hasLocale(seen)
      ? seen
      : matchLocale(parseAcceptLanguage(headers.get("accept-language")));
}
export function resolveLocale(headers: Headers): Locale {
  return preferredLocale(headers) ?? defaultLocale;
}
