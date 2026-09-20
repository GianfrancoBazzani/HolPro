import { auth } from "@/lib/auth/server";
import { loadUserWithRoles } from "@/lib/auth/repository";
import { isBlocked, roleOf } from "@/lib/auth/policy";
import { resolveLocale } from "@/lib/i18n/negotiate";
export async function requireAssistantUser(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableRefresh: true, disableCookieCache: true },
  });
  if (!session) return null;
  const user = await loadUserWithRoles(session.user.id);
  if (!user || isBlocked(user)) return null;
  const portal = new URL(request.url).searchParams.get("portal");
  if (portal !== null && portal !== "coach" && portal !== "coachee") return null;
  const role = roleOf(user, portal ?? undefined);
  if (!role) return null;
  return { user, role, locale: resolveLocale(request.headers) };
}
export const unauthorized = () =>
  Response.json({ error: "unauthorized" }, { status: 401 });
export const invalidInput = () =>
  Response.json({ error: "invalid_input" }, { status: 400 });
export const assistantError = () =>
  Response.json({ error: "assistant_error" }, { status: 500 });
