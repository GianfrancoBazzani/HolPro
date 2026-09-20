import type { CoachProfile } from "./types";
// requirePortalUser returns the user with its coach row; tests may omit it.
export function coachProfile(user: {
  coach?: { bio: string | null; acceptingClients: boolean } | null;
}): CoachProfile | undefined {
  return user.coach
    ? { bio: user.coach.bio ?? "", acceptingClients: user.coach.acceptingClients }
    : undefined;
}
