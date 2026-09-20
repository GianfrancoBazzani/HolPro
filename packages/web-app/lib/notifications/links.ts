// One source for the product deep links that notifications and the dashboard
// share. public/notifications-sw.js accepts only these pathnames.
export const coachEngagementHref = (engagementId: string) =>
  `/pro?engagement=${engagementId}`;
export const coachDraftReviewHref = (engagementId: string, planId: string) =>
  `${coachEngagementHref(engagementId)}&plan=${planId}&preview=draft`;
export const clientPlanHref = (planId: string) => `/app?plan=${planId}`;
export const clientHomeHref = "/app";
