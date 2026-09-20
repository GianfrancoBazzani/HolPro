"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/provider";
import { useFormAction } from "@/components/forms/use-form-action";
import {
  approvePlanDraft,
  discardPlanDraft,
} from "@/lib/pro/plan-document-actions";
export function PlanDraftControls({
  planId,
  draftId,
  published,
}: {
  planId: string;
  draftId: string;
  published: boolean;
}) {
  const t = useT("dashboard"),
    [confirm, setConfirm] = useState(false);
  const [state, submit, pending] = useFormAction(async (state, form) => {
    const result = await (
      form.get("intent") === "discard" ? discardPlanDraft : approvePlanDraft
    )(state, form);
    setConfirm(false);
    return result;
  });
  return (
    <form action={submit}>
      <input type="hidden" name="id" value={planId} />
      <input type="hidden" name="draftId" value={draftId} />
      <div className="form-actions plan-review-actions">
        <button
          type="submit"
          name="intent"
          value="approve"
          className="button button-primary"
          disabled={pending}
        >
          {t("plan.approve")}
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
              {t("plan.confirmDiscard")}
            </button>
            <button
              type="button"
              className="calendar-chip"
              disabled={pending}
              onClick={() => setConfirm(false)}
            >
              {t("plan.keepDraft")}
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
            {t("plan.discard")}
          </button>
        )}
      </div>
      {confirm && (
        <p>{t(published ? "plan.discardNote" : "plan.discardNoteNew")}</p>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {state.fields && (
        <p role="alert">{Object.values(state.fields).flat().join(" ")}</p>
      )}
    </form>
  );
}
