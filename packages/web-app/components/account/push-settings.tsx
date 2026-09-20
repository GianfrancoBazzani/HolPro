"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useT } from "@/components/i18n/provider";
import type { PortalKey } from "@/lib/auth/portals";

type PushState = { pushPublicKey: string | null; enabled: boolean };

export function PushSettings({ role }: { role: PortalKey }) {
  const t = useT("settings");
  const id = useId();
  const [state, setState] = useState<PushState>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [unavailable, setUnavailable] = useState<"push.unsupported" | "push.blocked">();
  const endpoint = `/api/onboarding?portal=${role}`;

  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw Error("unavailable");
    const data: { pushPublicKey: string | null; pushSubscribed: boolean } = await response.json();
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const blocked = supported && Notification.permission === "denied";
    const registration = supported ? await navigator.serviceWorker.getRegistration("/") : undefined;
    const subscription = await registration?.pushManager.getSubscription();
    return {
      state: { pushPublicKey: data.pushPublicKey, enabled: !!(data.pushSubscribed && subscription && !blocked) },
      unavailable: !supported ? "push.unsupported" as const : blocked ? "push.blocked" as const : undefined,
    };
  }, [endpoint]);

  useEffect(() => {
    let active = true;
    void load().then((result) => {
      if (!active) return;
      setState(result.state);
      setUnavailable(result.unavailable);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [load]);

  async function mutate(body: unknown) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw Error("unavailable");
  }

  async function toggle() {
    if (!state?.pushPublicKey || busy || unavailable) return;
    setBusy(true);
    setError(false);
    try {
      if (state.enabled) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await mutate({ action: "unsubscribe", endpoint: subscription.endpoint });
          await subscription.unsubscribe();
        }
        setState({ ...state, enabled: false });
      } else {
        if (await Notification.requestPermission() !== "granted") {
          if (Notification.permission === "denied") setUnavailable("push.blocked");
          else setError(true);
          return;
        }
        await navigator.serviceWorker.register("/notifications-sw.js");
        const registration = await navigator.serviceWorker.ready;
        const key = Uint8Array.from(
          atob(state.pushPublicKey.replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0),
        );
        const subscription = await registration.pushManager.getSubscription() ??
          await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        await mutate({ action: "subscribe", subscription: subscription.toJSON() });
        setState({ ...state, enabled: true });
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    setBusy(true);
    setError(false);
    try {
      const result = await load();
      setState(result.state);
      setUnavailable(result.unavailable);
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  return (
    <section className="account-settings-field push-settings" aria-busy={busy} aria-labelledby={id}>
      <div className="push-settings-row">
        <label id={id} htmlFor={`${id}-switch`}>{t("push.title")}</label>
        <button
          id={`${id}-switch`}
          type="button"
          role="switch"
          className="push-settings-switch"
          aria-labelledby={id}
          aria-describedby={`${id}-help`}
          aria-checked={state?.enabled ?? false}
          disabled={busy || !state?.pushPublicKey || !!unavailable}
          onClick={() => void toggle()}
        >
          <span aria-hidden="true" />
        </button>
      </div>
      <p id={`${id}-help`}>{t(unavailable ?? (state && !state.pushPublicKey ? "push.unavailable" : "push.help"))}</p>
      {!state && !error && <p role="status">{t("push.loading")}</p>}
      {error && <p role="alert">{t("push.error")}</p>}
      {error && <button type="button" className="account-control" disabled={busy} onClick={() => void retry()}>{t("push.retry")}</button>}
    </section>
  );
}
