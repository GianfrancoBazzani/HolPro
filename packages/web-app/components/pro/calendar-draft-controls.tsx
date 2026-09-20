"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/provider";
import { useFormAction } from "@/components/forms/use-form-action";
import {
  approveCalendarDraft,
  discardCalendarDraft,
} from "@/lib/pro/calendar-draft-actions";
export function CalendarDraftControls({
  engagementId,
  draftId,
  invalid = false,
}: {
  engagementId: string;
  draftId: string;
  invalid?: boolean;
}) {
  const t = useT("pro"),
    [confirm, setConfirm] = useState(false);
  const [state, submit, pending] = useFormAction(async (state, form) => {
    const result = await (
      form.get("intent") === "discard"
        ? discardCalendarDraft
        : approveCalendarDraft
    )(state, form);
    setConfirm(false);
    return result;
  });
  return (
    <form action={submit}>
      <input type="hidden" name="engagementId" value={engagementId} />
      <input type="hidden" name="draftId" value={draftId} />
      <div className="form-actions plan-review-actions">
        <button
          type="submit"
          name="intent"
          value="approve"
          className="button button-primary"
          disabled={pending || invalid}
        >
          {t("calendarDraft.approve")}
        </button>
        {confirm ? (
          <>
            <button
              type="submit"
              name="intent"
              value="discard"
              className="button button-secondary"
              disabled={pending}
            >
              {t("calendarDraft.confirmDiscard")}
            </button>
            <button
              type="button"
              className="calendar-chip"
              disabled={pending}
              onClick={() => setConfirm(false)}
            >
              {t("calendarDraft.keepDraft")}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="button button-secondary"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              setConfirm(true);
            }}
          >
            {t("calendarDraft.discard")}
          </button>
        )}
      </div>
      {confirm && <p>{t("calendarDraft.discardNote")}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {state.fields && (
        <p role="alert">{Object.values(state.fields).flat().join(" ")}</p>
      )}
    </form>
  );
}
