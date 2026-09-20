// One source for the product deep links that notifications and the dashboard
// share. public/notifications-sw.js accepts only these pathnames.
export const coachEngagementHref = (engagementId: string) =>
  `/pro/clients/${encodeURIComponent(engagementId)}`;
export const coachDraftReviewHref = (engagementId: string, planId: string) =>
  `${coachEngagementHref(engagementId)}?plan=${encodeURIComponent(planId)}&preview=draft`;
export const clientPlanHref = (planId: string) => `/app?plan=${planId}`;
export const clientHomeHref = "/app";
