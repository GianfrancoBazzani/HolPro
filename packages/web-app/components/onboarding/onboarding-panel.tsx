"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import type { PortalKey } from "@/lib/auth/portals";
import type { listOnboarding } from "@/lib/onboarding/repository";
import type { listNotifications } from "@/lib/notifications/repository";
type Data = {
  requests: Awaited<ReturnType<typeof listOnboarding>>;
  notifications: Awaited<ReturnType<typeof listNotifications>>;
  pushPublicKey: string | null;
  pushSubscribed: boolean;
};
export function OnboardingPanel({ role }: { role: PortalKey }) {
  const t = useT("dashboard"),
    router = useRouter();
  const [data, setData] = useState<Data | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const previous = useRef<string | null>(null);
  const endpoint = `/api/onboarding?portal=${role}`;
  const load = useCallback(async () => {
    const result = await fetch(endpoint, { cache: "no-store" });
    if (!result.ok) throw Error("unavailable");
    const next: Data = await result.json();
    const fingerprint = next.requests
      .map((r) => `${r.id}:${r.status}`)
      .join("|");
    if (previous.current !== null && previous.current !== fingerprint)
      router.refresh();
    previous.current = fingerprint;
    setData(next);
    setError(false);
  }, [endpoint, router]);
  const mutate = useCallback(
    async (body: unknown) => {
      const result = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!result.ok) throw Error("unavailable");
    },
    [endpoint],
  );
  useEffect(() => {
    let active = true;
    // A hidden tab cannot show an update; do not poll for one.
    const poll = () => {
      if (active && document.visibilityState === "visible")
        void load().catch(() => {
          if (active) setError(true);
        });
    };
    poll();
    const timer = setInterval(poll, 10000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [load]);
  const run = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      setError(false);
      try {
        await action();
        await load();
      } catch {
        setError(true);
      } finally {
        setBusy(false);
      }
    },
    [load],
  );
  const enablePush = () =>
    run(async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !data?.pushPublicKey
      )
        throw Error("unsupported");
      if ((await Notification.requestPermission()) !== "granted")
        throw Error("permission_denied");
      await navigator.serviceWorker.register("/notifications-sw.js");
      const registration = await navigator.serviceWorker.ready;
      const key = Uint8Array.from(
        atob(data.pushPublicKey.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0),
      );
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      await mutate({
        action: "subscribe",
        subscription: subscription.toJSON(),
      });
    });
  const disablePush = () =>
    run(async () => {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return;
      await mutate({ action: "unsubscribe", endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    });
  const retry = (id: string) => run(() => mutate({ action: "retry", id }));
  const requests = data?.requests.filter((r) => r.status !== "approved") ?? [];
  return (
    <section className="dashboard-panel" aria-label={t("onboarding.title")}>
      <h2>{t("onboarding.title")}</h2>
      {requests.map((r) => (
        <div key={r.id}>
          <p>
            {t(
              role === "coach"
                ? `onboarding.coach.${r.status}`
                : `onboarding.${r.status}`,
              { coachName: r.coachName, clientName: r.clientName },
            )}
          </p>
          {role === "coach" && (
            <a href={`/pro/clients/${r.engagementId}`}>
              {t("onboarding.customer")}
            </a>
          )}
          {r.status === "failed" && (
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => void retry(r.id)}
            >
              {t("onboarding.retry")}
            </button>
          )}
        </div>
      ))}
      {data?.notifications.map((n) => (
        <div key={n.id}>
          <a
            href={n.href}
            onClick={() => {
              void mutate({ action: "read", id: n.id }).catch(() => {});
            }}
          >
            {t(`notification.${n.kind}.title`)}
          </a>
          {!n.readAt && <span> {t("notification.unread")}</span>}
        </div>
      ))}
      {data && requests.length === 0 && data.notifications.length === 0 && (
        <p>{t("onboarding.empty")}</p>
      )}
      {data?.pushPublicKey && (
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={() =>
            void (data.pushSubscribed ? disablePush() : enablePush())
          }
        >
          {t(
            data.pushSubscribed
              ? "notification.disablePush"
              : "notification.enablePush",
          )}
        </button>
      )}
      {error && <p role="status">{t("notification.error")}</p>}
    </section>
  );
}
