import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  push: vi.fn(),
  email: vi.fn(),
  recipient: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("web-push", () => ({ default: { sendNotification: f.push } }));
vi.mock("../lib/email/resend", () => ({ sendEmail: f.email }));
vi.mock("../lib/notifications/repository", () => ({
  notificationRecipient: f.recipient,
  removePushSubscription: f.remove,
}));
import { deliverNotification } from "../lib/notifications/delivery";
import type { claimNotification } from "../lib/notifications/repository";
const row: NonNullable<Awaited<ReturnType<typeof claimNotification>>> = {
  id: "n",
  userId: "coach",
  kind: "draft_ready",
  href: "/pro?plan=p",
  leaseToken: "11111111-1111-4111-8111-111111111111",
  leaseUntil: new Date(),
  attempts: 1,
  requestId: "request",
  readAt: null,
  deliveredAt: null,
  nextAttemptAt: new Date(),
  createdAt: new Date(),
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("WEB_PUSH_PUBLIC_KEY", "public");
  vi.stubEnv("WEB_PUSH_PRIVATE_KEY", "private");
  vi.stubEnv("WEB_PUSH_SUBJECT", "mailto:test@example.test");
  vi.stubEnv("ONBOARDING_EMAIL_ENABLED", "true");
  f.recipient.mockResolvedValue({
    user: { id: "coach", email: "coach@example.test", locale: "it" },
    subscriptions: [
      {
        endpoint: "https://fcm.googleapis.com/push/id",
        p256dh: "key",
        auth: "auth",
      },
    ],
  });
  f.push.mockResolvedValue({});
  f.email.mockResolvedValue(undefined);
});
it("sends a localized private review link only to the stored recipient", async () => {
  await deliverNotification(row);
  const message = f.email.mock.calls[0][0];
  expect(message.to).toBe("coach@example.test");
  expect(message.subject).toBe(
    "La bozza di un nuovo cliente è pronta per la revisione",
  );
  expect(message.html).toContain('lang="it"');
  expect(message.text).toContain("/pro?plan=p");
  expect(f.email.mock.calls[0][1]).toBe("onboarding/n");
  const payload = JSON.parse(f.push.mock.calls[0][1]);
  expect(payload).toMatchObject({
    tag: "n",
    href: "/pro?plan=p",
    title: message.subject,
  });
  expect(payload).not.toHaveProperty("goals");
});
it("removes expired device endpoints without failing the email", async () => {
  f.push.mockRejectedValue({ statusCode: 410 });
  await deliverNotification(row);
  expect(f.remove).toHaveBeenCalledWith(
    "coach",
    "https://fcm.googleapis.com/push/id",
  );
  expect(f.email).toHaveBeenCalledOnce();
});
it("keeps delivery retryable if a provider fails", async () => {
  f.email.mockRejectedValue(Error("offline"));
  await expect(deliverNotification(row)).rejects.toThrow(
    "notification_delivery_failed",
  );
});
it("does not send to a blocked or deleted account", async () => {
  f.recipient.mockResolvedValue({ user: undefined, subscriptions: [] });
  await deliverNotification(row);
  expect(f.push).not.toHaveBeenCalled();
  expect(f.email).not.toHaveBeenCalled();
});
it("does not send email when disabled", async () => {
  vi.stubEnv("ONBOARDING_EMAIL_ENABLED", "false");
  await deliverNotification(row);
  expect(f.email).not.toHaveBeenCalled();
});
