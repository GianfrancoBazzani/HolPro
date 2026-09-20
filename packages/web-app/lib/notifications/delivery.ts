import webpush from "web-push";
import {
  notificationRecipient,
  removePushSubscription,
  type claimNotification,
} from "./repository";
import { getTranslator } from "@/lib/i18n/dictionary";
import { hasLocale } from "@/lib/i18n/config";
import { baseURL, portals } from "@/lib/auth/portals";
import { emailTemplate } from "@/lib/email/templates/base";
import { sendEmail } from "@/lib/email/resend";
import { allowedPushEndpoint, pushPublicKey } from "./push-input";
export async function deliverNotification(
  row: NonNullable<Awaited<ReturnType<typeof claimNotification>>>,
) {
  const { user, subscriptions } = await notificationRecipient(row.userId);
  if (!user) return;
  const locale = hasLocale(user.locale) ? user.locale : "en";
  const t = await getTranslator(locale, "dashboard");
  const publicKey = pushPublicKey();
  let failed = false;
  if (publicKey) {
    const payload = JSON.stringify({
      title: t(`notification.${row.kind}.title`),
      body: t(`notification.${row.kind}.body`),
      href: row.href,
      tag: row.id,
    });
    // Independent push services; one slow endpoint must not delay the others.
    await Promise.all(
      subscriptions
        .filter((sub) => allowedPushEndpoint(sub.endpoint))
        .map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload,
              {
                TTL: 86400,
                timeout: 10_000,
                vapidDetails: {
                  subject: process.env.WEB_PUSH_SUBJECT!,
                  publicKey,
                  privateKey: process.env.WEB_PUSH_PRIVATE_KEY!,
                },
              },
            );
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410)
              await removePushSubscription(user.id, sub.endpoint);
            else failed = true;
          }
        }),
    );
  }
  if (process.env.ONBOARDING_EMAIL_ENABLED === "true") {
    try {
      const email = await emailTemplate(
        {
          url: new URL(row.href, baseURL).href,
          portal: row.kind === "draft_ready" ? portals.coach : portals.coachee,
          locale,
        },
        row.kind,
      );
      await sendEmail({ to: user.email, ...email }, `onboarding/${row.id}`);
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error("notification_delivery_failed");
}
