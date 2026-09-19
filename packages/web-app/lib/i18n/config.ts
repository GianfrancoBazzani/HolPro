export const locales = {
  en: { name: "English", dir: "ltr" },
  es: { name: "Español", dir: "ltr" },
} as const;
export type Locale = keyof typeof locales;
export const localeKeys = Object.keys(locales) as Locale[];
export const defaultLocale: Locale = "en";
export const localeCookie = "hp_locale";
export const seenCookie = "hp_seen";
// Shared attributes of both language cookies; each site adds httpOnly/maxAge.
export const cookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
} as const;
export function hasLocale(value: unknown): value is Locale {
  return typeof value === "string" && Object.hasOwn(locales, value);
}
