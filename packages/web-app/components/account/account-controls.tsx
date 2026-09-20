"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/lib/auth/actions";
import { chooseLocale } from "@/lib/i18n/actions";
import { localeKeys, locales, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/components/i18n/provider";
import type { CoachProfile } from "@/lib/pro/types";
import { ProfileForm } from "./profile-form";
import "./account-controls.css";

function LanguageForm() {
  const locale = useLocale();
  const t = useT("settings");
  const { pending } = useFormStatus();
  const [selected, setSelected] = useState<Locale>(locale);
  const id = useId();

  return (
    <>
      <div className="account-settings-field">
        <label htmlFor={id}>{t("language")}</label>
        <p id={`${id}-help`}>{t("languageHelp")}</p>
        <select
          id={id}
          name="locale"
          value={selected}
          lang={selected}
          aria-describedby={`${id}-help`}
          disabled={pending}
          onChange={(event) => setSelected(event.target.value as Locale)}
        >
          {localeKeys.map((key) => (
            <option key={key} value={key} lang={key}>
              {locales[key].name}
            </option>
          ))}
        </select>
      </div>
      <div className="account-settings-footer">
        <button
          className="button button-primary"
          type="submit"
          disabled={pending || selected === locale}
          aria-busy={pending}
        >
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </>
  );
}

export function AccountControls({ profile }: { profile?: CoachProfile }) {
  const locale = useLocale();
  const t = useT("settings");
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [opening, setOpening] = useState(0);

  // Keep the trigger mounted so a successful save restores keyboard focus.
  useEffect(() => {
    dialog.current?.close();
  }, [locale]);

  return (
    <div className="account-controls">
      <button
        className="account-control"
        type="button"
        aria-haspopup="dialog"
        aria-controls={id}
        onClick={() => {
          setOpening((value) => value + 1);
          dialog.current?.showModal();
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 1.72l-.12.86a2 2 0 0 1-1.18 1.52l-.2.09a2 2 0 0 1-1.9-.18l-.7-.53a2 2 0 0 0-2.64.68l-.22.38a2 2 0 0 0 .64 2.7l.7.53a2 2 0 0 1 .72 1.78v.22a2 2 0 0 1-.72 1.78l-.7.53a2 2 0 0 0-.64 2.7l.22.38a2 2 0 0 0 2.64.68l.7-.53a2 2 0 0 1 1.9-.18l.2.09a2 2 0 0 1 1.18 1.52l.12.86a2 2 0 0 0 2 1.72h.44a2 2 0 0 0 2-1.72l.12-.86a2 2 0 0 1 1.18-1.52l.2-.09a2 2 0 0 1 1.9.18l.7.53a2 2 0 0 0 2.64-.68l.22-.39a2 2 0 0 0-.64-2.7l-.7-.52a2 2 0 0 1-.72-1.78v-.22a2 2 0 0 1 .72-1.78l.7-.53a2 2 0 0 0 .64-2.7l-.22-.38a2 2 0 0 0-2.64-.68l-.7.53a2 2 0 0 1-1.9.18l-.2-.09a2 2 0 0 1-1.18-1.52l-.12-.86a2 2 0 0 0-2-1.72Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {t("open")}
      </button>
      <form action={signOut}>
        <button className="account-control" type="submit">
          {t("signout")}
        </button>
      </form>
      <dialog
        ref={dialog}
        id={id}
        className="account-settings"
        aria-labelledby={`${id}-title`}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          ) dialog.current?.close();
        }}
      >
        <div className="account-settings-heading">
          <h2 id={`${id}-title`}>{t("title")}</h2>
          <button
            className="account-control account-settings-close"
            type="button"
            aria-label={t("close")}
            onClick={() => dialog.current?.close()}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>
        {profile && <ProfileForm key={opening} profile={profile} />}
        <form action={chooseLocale} className="account-settings-form">
          <LanguageForm key={`${locale}-${opening}`} />
        </form>
      </dialog>
    </div>
  );
}
