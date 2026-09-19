import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import {
  callbackError,
  isProtectedPath,
  portalFromPath,
  portalUrls,
} from "./lib/auth/portals";
import {
  cookieOptions,
  defaultLocale,
  localeCookie,
  seenCookie,
  type Locale,
} from "./lib/i18n/config";
import { resolveLocale } from "./lib/i18n/negotiate";
import { splitLocale, isMarketingPath } from "./lib/i18n/routes";
function seen(response: NextResponse, request: NextRequest, locale: Locale) {
  if (!request.cookies.has(localeCookie))
    response.cookies.set(seenCookie, locale, {
      ...cookieOptions,
      httpOnly: true,
    });
  return response;
}
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const { locale, path } = splitLocale(pathname);
  const target = request.nextUrl.clone();
  if (locale) {
    if (isMarketingPath(path) && locale !== defaultLocale)
      return seen(NextResponse.next(), request, locale);
    target.pathname = path;
    return NextResponse.redirect(target, 308);
  }
  if (isMarketingPath(pathname)) {
    target.pathname = `/${defaultLocale}`;
    return seen(NextResponse.rewrite(target), request, defaultLocale);
  }
  // Optimistic cookie check only; each area's gate remains authoritative.
  if (isProtectedPath(pathname)) {
    const urls = portalUrls(portalFromPath(pathname));
    const error = callbackError(searchParams.get("error"));
    if (error)
      return NextResponse.redirect(new URL(urls.login(error), request.url));
    if (!getSessionCookie(request))
      return NextResponse.redirect(new URL(urls.login(), request.url));
  }
  target.pathname = `/${resolveLocale(request.headers)}${pathname}`;
  return NextResponse.rewrite(target);
}
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
