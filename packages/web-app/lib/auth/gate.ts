import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./server";
import { loadUserWithRoles } from "./repository";
import { decideGate } from "./policy";
import { portalUrls, type Portal } from "./portals";
// Read-only. Writes happen in Server Actions and route handlers. React cache
// shares one result when a layout and its page both call the gate.
export const requirePortalUser = cache(
  async (portal: Portal, welcome = false) => {
    const urls = portalUrls(portal);
    const session = await auth.api.getSession({
      headers: await headers(),
      query: { disableRefresh: true },
    });
    if (!session) redirect(urls.login());
    const user = await loadUserWithRoles(session.user.id);
    const decision = decideGate(user, portal);
    if (decision === "blocked") redirect(urls.reject(true));
    if (decision === "reject") redirect(urls.reject());
    if (decision === "register" && !welcome) redirect(urls.welcome);
    if (decision === "enter" && welcome) redirect(urls.home);
    return user!;
  },
);
