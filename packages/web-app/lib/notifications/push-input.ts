import { z } from "zod";
// Push is configured only when all three VAPID values are present.
export const pushPublicKey = () =>
  process.env.WEB_PUSH_PUBLIC_KEY &&
  process.env.WEB_PUSH_PRIVATE_KEY &&
  process.env.WEB_PUSH_SUBJECT
    ? process.env.WEB_PUSH_PUBLIC_KEY
    : null;
// Push subscriptions are network destinations. Accept only known browser push
// services, never arbitrary URLs (including private hosts, ports or credentials).
export function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      (url.hostname === "fcm.googleapis.com" ||
        url.hostname === "updates.push.services.mozilla.com" ||
        url.hostname === "web.push.apple.com" ||
        /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname))
    );
  } catch {
    return false;
  }
}
export const pushInput = z.object({
  endpoint: z.string().max(2048).refine(allowedPushEndpoint),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}={0,1}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
  }),
});
