import { defaultLocale, hasLocale, type Locale } from "./config";
export function splitLocale(pathname: string): {
  locale?: Locale;
  path: string;
} {
  const [first, ...rest] = pathname.slice(1).split("/");
  return hasLocale(first)
    ? { locale: first, path: `/${rest.join("/")}` }
    : { path: pathname };
}
export function isMarketingPath(path: string) {
  return path === "/";
}
export function localePath(locale: Locale, path: string): string {
  const unprefixed = splitLocale(path).path;
  return isMarketingPath(unprefixed) && locale !== defaultLocale
    ? `/${locale}`
    : unprefixed;
}
