"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { updateUserLocale } from "@/lib/auth/repository";
import { baseURL } from "@/lib/auth/portals";
import {
  cookieOptions,
  hasLocale,
  localeCookie,
  seenCookie,
  type Locale,
} from "./config";
import { localePath } from "./routes";
// Same-origin path only, re-prefixed for the chosen locale.
function destination(value: string, locale: Locale, referer = false): string {
  try {
    const decoded = decodeURIComponent(value);
    if (/[\\\u0000-\u001f]/.test(decoded) || decoded.startsWith("//"))
      return "/";
    if (!referer && !value.startsWith("/")) return "/";
    const url = new URL(value, baseURL);
    if (url.origin !== new URL(baseURL).origin) return "/";
    url.pathname = localePath(locale, url.pathname);
    if (decodeURIComponent(url.pathname).startsWith("//")) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
export async function chooseLocale(form: FormData) {
  const locale = form.get("locale");
  if (!hasLocale(locale)) return;
  const store = await cookies();
  store.set(localeCookie, locale, {
    ...cookieOptions,
    httpOnly: false,
    maxAge: 365 * 24 * 60 * 60,
  });
  store.delete(seenCookie);
  const incoming = await headers();
  const session = await auth.api.getSession({ headers: incoming });
  if (session) await updateUserLocale(session.user.id, locale);
  const next = form.get("next");
  redirect(
    typeof next === "string"
      ? destination(next, locale)
      : destination(incoming.get("referer") ?? "/", locale, true),
  );
}
