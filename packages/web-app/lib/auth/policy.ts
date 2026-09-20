import type { Portal, PortalKey } from "./portals";
export type GateDecision = "blocked" | "enter" | "register" | "reject";
export type RoleUser = {
  status: string;
  deletedAt: Date | null;
  coach: unknown;
  coachee: unknown;
};
export function isBlocked(
  user: Pick<RoleUser, "status" | "deletedAt"> | undefined,
) {
  return !user || user.status === "suspended" || !!user.deletedAt;
}
// Without an explicit portal, prefer the coach role for dual-role accounts.
export function roleOf(
  user: Pick<RoleUser, "coach" | "coachee">,
  requested?: PortalKey,
): PortalKey | undefined {
  if (requested) return user[requested] ? requested : undefined;
  return user.coach ? "coach" : user.coachee ? "coachee" : undefined;
}
export function decideGate(
  user: RoleUser | undefined,
  portal: Portal,
): GateDecision {
  if (!user || isBlocked(user)) return "blocked";
  const hasCoach = !!user.coach,
    hasCoachee = !!user.coachee;
  if (portal.key === "coach" ? hasCoach : hasCoachee) return "enter";
  return hasCoach || hasCoachee ? "reject" : "register";
}
