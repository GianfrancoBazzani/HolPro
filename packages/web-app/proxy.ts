import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { callbackError, portalFromPath, portalUrls } from "./lib/auth/portals";
// Optimistic check only. The gate in each area is the real check.
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const urls = portalUrls(portalFromPath(pathname));
  // Better Auth sends a failed link back to the callback URL with ?error=.
  const error = callbackError(searchParams.get("error"));
  if (error) return NextResponse.redirect(new URL(urls.login(error), request.url));
  if (!getSessionCookie(request))
    return NextResponse.redirect(new URL(urls.login(), request.url));
  return NextResponse.next();
}
export const config = {
  // `/pro/login` and its children are public, so the pattern excludes them.
  matcher: ["/app", "/app/:path*", "/pro", "/pro/((?!login).*)"],
};
