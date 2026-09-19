import { headers } from "next/headers";
import { auth } from "./server";
import { loadUserWithRoles } from "./repository";
import { isBlocked } from "./policy";
import { portals } from "./portals";

export async function getDashboardHref() {
  const session = await auth.api.getSession({
    headers: await headers(),
    // Verify the token against the session store without refreshing it during render.
    query: { disableRefresh: true, disableCookieCache: true },
  });
  if (!session) return null;
  const user = await loadUserWithRoles(session.user.id);
  if (!user || isBlocked(user)) return null;
  return user.coach ? portals.coach.homePath : portals.coachee.homePath;
}
