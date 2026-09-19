import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./server";
import { loadUserWithRoles } from "./repository";
import { decideGate, type GateDecision } from "./policy";
import { portalUrls, type Portal } from "./portals";
// The page a gate decision belongs to. A request for a different page
// redirects to the page of the decision.
export type GatePage = "home" | "welcome" | "switch";
const pageFor: Record<Exclude<GateDecision, "blocked">, GatePage> = {
  enter: "home",
  register: "welcome",
  reject: "switch",
};
// Read-only. Writes happen in Server Actions and route handlers. React cache
// shares one result when a layout and its page both call the gate.
export const requirePortalUser = cache(
  async (portal: Portal, page: GatePage = "home") => {
    const urls = portalUrls(portal);
    const session = await auth.api.getSession({
      headers: await headers(),
      query: { disableRefresh: true },
    });
    if (!session) redirect(urls.login());
    const user = await loadUserWithRoles(session.user.id);
    const decision = decideGate(user, portal);
    // Only a blocked account loses its session.
    if (decision === "blocked") redirect(urls.reject);
    const target = pageFor[decision];
    if (target !== page) redirect(urls[target]);
    return user!;
  },
);
