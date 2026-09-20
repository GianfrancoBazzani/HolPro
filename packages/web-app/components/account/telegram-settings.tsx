"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useT } from "@/components/i18n/provider";
import type { PortalKey } from "@/lib/auth/portals";
import type { LinkResult, LinkView } from "@/lib/telegram/state";
import {
  getTelegramLink,
  requestTelegramLink,
  cancelTelegramLink,
  removeTelegramLink,
} from "@/lib/telegram/actions";
export function TelegramConnection({
  state,
  busy,
  onConnect,
  onCancel,
  onDisconnect,
}: {
  state: LinkView;
  busy: boolean;
  onConnect: () => void;
  onCancel: (id: string) => void;
  onDisconnect: () => void;
}) {
  const t = useT("settings");
  const locale = useLocale();
  const [now, setNow] = useState(() => Date.now());
  const expiration =
    state.state === "pending" ? new Date(state.expiresAt).getTime() : null;
  useEffect(() => {
    if (expiration == null) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(0, expiration - Date.now()) + 10,
    );
    return () => clearTimeout(timer);
  }, [expiration]);
  const date = (value: string, timezone: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(value));
  if (state.state === "disabled") return null;
  return (
    <>
      {state.state === "disconnected" && (
        <>
          <p>{t("telegram.help")}</p>
          <button
            className="button button-primary"
            type="button"
            disabled={busy}
            onClick={onConnect}
          >
            {t("telegram.connect")}
          </button>
        </>
      )}
      {state.state === "pending" && (
        <>
          <p>
            {expiration! <= now
              ? t("telegram.expired")
              : t("telegram.pending", {
                  date: date(state.expiresAt, state.timezone),
                })}
          </p>
          {!state.url && expiration! > now && <p>{t("telegram.reopen")}</p>}
          <div className="telegram-settings-actions">
            {state.url && expiration! > now && !busy ? (
              <a
                className="button button-primary"
                href={state.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("telegram.open")}
              </a>
            ) : (
              <button
                className="button button-primary"
                type="button"
                disabled={busy}
                onClick={onConnect}
              >
                {t("telegram.regenerate")}
              </button>
            )}
            <button
              className="account-control"
              type="button"
              disabled={busy}
              onClick={() => onCancel(state.id)}
            >
              {t("telegram.cancel")}
            </button>
          </div>
        </>
      )}
      {state.state === "connected" && (
        <>
          <p>
            {state.username
              ? t("telegram.connected", {
                  username: state.username,
                  date: date(state.linkedAt, state.timezone),
                })
              : t("telegram.connectedNoUsername", {
                  date: date(state.linkedAt, state.timezone),
                })}
          </p>
          <p>
            {t(
              state.role === "coach"
                ? "telegram.role.coach"
                : "telegram.role.coachee",
            )}
          </p>
          <p>{t("telegram.switchRole")}</p>
          <button
            className="account-control"
            type="button"
            disabled={busy}
            onClick={onDisconnect}
          >
            {t("telegram.disconnect")}
          </button>
        </>
      )}
      {state.state === "revoked" && (
        <>
          <p>{t("telegram.revoked")}</p>
          <button
            className="account-control"
            type="button"
            disabled={busy}
            onClick={onDisconnect}
          >
            {t("telegram.disconnect")}
          </button>
        </>
      )}
    </>
  );
}
export function TelegramSettings({ role }: { role: PortalKey }) {
  const t = useT("settings");
  const id = useId();
  const [state, setState] = useState<LinkView>();
  const [error, setError] = useState<
    "telegram.error" | "telegram.unavailable"
  >();
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  useEffect(() => {
    const current = ++version.current;
    void getTelegramLink()
      .then((result) => {
        if (current !== version.current) return;
        if ("error" in result) setError(result.error);
        else setState(result);
      })
      .catch(() => {
        if (current === version.current) setError("telegram.error");
      });
    const requestVersion = version;
    return () => {
      requestVersion.current++;
    };
  }, []);
  async function update(action: () => Promise<LinkResult>) {
    const current = ++version.current;
    setBusy(true);
    setError(undefined);
    try {
      const result = await action();
      if (current !== version.current) return;
      if ("error" in result) setError(result.error);
      else setState(result);
    } catch {
      if (current === version.current) setError("telegram.error");
    } finally {
      if (current === version.current) setBusy(false);
    }
  }
  if (state?.state === "disabled") return null;
  return (
    <section
      className="account-settings-field telegram-settings"
      aria-labelledby={id}
      aria-busy={busy}
    >
      <h3 id={id}>{t("telegram.title")}</h3>
      {!state && !error && <p role="status">{t("telegram.loading")}</p>}
      {error && (
        <>
          <p role="alert">{t(error)}</p>
          <button
            className="account-control"
            type="button"
            disabled={busy}
            onClick={() => update(getTelegramLink)}
          >
            {t("telegram.retry")}
          </button>
        </>
      )}
      {state && (
        <TelegramConnection
          state={state}
          busy={busy}
          onConnect={() => update(() => requestTelegramLink(role))}
          onCancel={(linkId) => update(() => cancelTelegramLink(linkId))}
          onDisconnect={() => update(removeTelegramLink)}
        />
      )}
      {busy && <p role="status">{t("telegram.working")}</p>}
    </section>
  );
}
