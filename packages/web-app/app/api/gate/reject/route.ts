import { auth } from "@/lib/auth/server";
import { rejectDestination } from "@/lib/auth/portals";
// Only the gate sends a browser here, through a same-origin redirect. A
// cross-site request, such as an embedded image, must not sign anyone out.
export function isNavigationFromThisSite(headers: Headers) {
  const site = headers.get("sec-fetch-site");
  const dest = headers.get("sec-fetch-dest");
  if (site === "cross-site") return false;
  if (dest && dest !== "document") return false;
  return true;
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL(
    isNavigationFromThisSite(request.headers)
      ? rejectDestination(
          url.searchParams.get("portal"),
          url.searchParams.get("reason"),
        )
      : "/",
    request.url,
  );
  const result = new Response(null, {
    status: 303,
    headers: { Location: target.toString(), "Cache-Control": "no-store" },
  });
  if (target.pathname === "/") return result;
  const response = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
  for (const cookie of response.headers.getSetCookie())
    result.headers.append("Set-Cookie", cookie);
  return result;
}
