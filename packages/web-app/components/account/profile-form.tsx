"use client";
import { useId, useState } from "react";
import { useLocale, useT } from "@/components/i18n/provider";
import { TextareaField } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { updateCoachProfile } from "@/lib/pro/profile-actions";
import { limits } from "@/lib/pro/schemas";
import type { CoachProfile } from "@/lib/pro/types";
export function ProfileForm({ profile }: { profile: CoachProfile }) {
  const t = useT("settings"),
    locale = useLocale(),
    id = useId();
  const [state, submit, pending, formRef] = useFormAction(updateCoachProfile);
  const [bio, setBio] = useState(profile.bio);
  const remaining = new Intl.NumberFormat(locale).format(
    limits.bioMax - bio.length,
  );
  return (
    <form ref={formRef} action={submit} className="account-settings-form">
      <fieldset className="account-settings-fieldset" disabled={pending}>
        <legend className="eyebrow">{t("profile.title")}</legend>
        <TextareaField
          name="bio"
          label={t("profile.bio")}
          help={`${t("profile.bioHelp")} ${t("profile.bioCount", { remaining })}`}
          value={bio}
          rows={5}
          maxLength={limits.bioMax}
          onChange={(event) => setBio(event.target.value)}
          errors={state.fields?.bio}
        />
        <div className="account-settings-field account-settings-check">
          <input
            id={`${id}-accepting`}
            type="checkbox"
            name="acceptingClients"
            defaultChecked={profile.acceptingClients}
          />
          <label htmlFor={`${id}-accepting`}>{t("profile.accepting")}</label>
          <p>{t("profile.acceptingHelp")}</p>
        </div>
        {state.error && <p role="alert">{state.error}</p>}
        {state.ok && <p role="status">{t("profile.saved")}</p>}
        <div className="account-settings-footer">
          <button
            className="button button-primary"
            type="submit"
            aria-busy={pending}
          >
            {pending ? t("saving") : t("profile.save")}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
