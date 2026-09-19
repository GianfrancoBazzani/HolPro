"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/provider";
import { useFormAction } from "@/components/forms/use-form-action";
import type { ProAction, ProActionState } from "@/lib/pro/types";
type DeleteProps = { id: string; title: string; note?: string };
export function DeleteControl({
  action,
  ...props
}: DeleteProps & { action: ProAction }) {
  const [state, submit, pending] = useFormAction(action);
  return (
    <DeleteForm {...props} state={state} submit={submit} pending={pending} />
  );
}
// Event dialogs own both action states so saving, deleting and dismissal share
// one pending lock. Outline deletes can use the self-contained wrapper above.
export function DeleteForm({
  id,
  title,
  note,
  state,
  submit,
  pending,
}: DeleteProps & {
  state: ProActionState;
  submit: (form: FormData) => void;
  pending: boolean;
}) {
  const t = useT("pro"),
    [confirm, setConfirm] = useState(false);
  return (
    <form action={submit} className="pro-delete">
      <input type="hidden" name="id" value={id} />
      <div className="form-actions">
        {confirm ? (
          <>
            <button className="calendar-chip" type="submit" disabled={pending}>
              {t("form.confirmDelete")}
            </button>
            <button
              className="calendar-chip"
              type="button"
              disabled={pending}
              onClick={() => setConfirm(false)}
            >
              {t("form.keep")}
            </button>
            {note && <p>{note}</p>}
          </>
        ) : (
          <button
            className="calendar-chip"
            type="button"
            disabled={pending}
            aria-label={t("plan.deleteLabel", { title })}
            onClick={(event) => {
              // React reuses this button for the submit control. Cancel this
              // click's default action before its type changes to submit.
              event.preventDefault();
              setConfirm(true);
            }}
          >
            {t("form.delete")}
          </button>
        )}
      </div>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
