"use client";
import { useEffect } from "react";
import { useT } from "@/components/i18n/provider";
import { Field, SelectField, TextareaField } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { useFormAction } from "@/components/forms/use-form-action";
import { saveAgendaEvent, deleteAgendaEvent } from "@/lib/pro/agenda-actions";
import { dayIn } from "@/lib/calendar/dates";
import { timeIn } from "@/lib/pro/dates";
import { limits } from "@/lib/pro/schemas";
import type { AgendaEvent } from "@/lib/pro/types";
import { DeleteForm } from "./delete-control";
export function EventDialog({
  event,
  day,
  timezone,
  clients,
  onClose,
}: {
  event?: AgendaEvent;
  day: string;
  timezone: string;
  clients: { engagementId: string; name: string }[];
  onClose: () => void;
}) {
  const t = useT("pro"),
    [state, submit, saving, formRef] = useFormAction(saveAgendaEvent);
  const [deleteState, deleteSubmit, deleting] =
    useFormAction(deleteAgendaEvent);
  const pending = saving || deleting;
  useEffect(() => {
    if (state.ok || deleteState.ok) onClose();
  }, [state, deleteState, onClose]);
  const errors = state.fields;
  return (
    <FormDialog
      open
      busy={pending}
      title={t(event ? "event.edit" : "event.new")}
      onClose={onClose}
    >
      <form ref={formRef} action={submit} className="pro-form">
        <fieldset disabled={pending}>
          {event && <input type="hidden" name="id" value={event.id} />}
          <Field
            name="title"
            label={t("event.title")}
            defaultValue={event?.title}
            required
            maxLength={limits.titleMax}
            errors={errors?.title}
          />
          <SelectField
            name="kind"
            label={t("event.kind")}
            defaultValue={event?.kind ?? "call"}
            options={[
              { value: "call", label: t("kind.call") },
              { value: "event", label: t("kind.event") },
            ]}
            errors={errors?.kind}
          />
          <SelectField
            name="engagementId"
            label={t("event.client")}
            defaultValue={event?.engagementId ?? ""}
            options={[
              { value: "", label: t("event.noClient") },
              ...clients.map((c) => ({ value: c.engagementId, label: c.name })),
            ]}
            errors={errors?.engagementId}
          />
          <Field
            name="date"
            type="date"
            label={t("event.date")}
            defaultValue={
              event ? dayIn(new Date(event.startsAt), timezone) : day
            }
            min="1000-01-01"
            max="9999-12-31"
            required
            errors={errors?.date}
          />
          <Field
            name="time"
            type="time"
            label={t("event.time")}
            defaultValue={
              event ? timeIn(new Date(event.startsAt), timezone) : ""
            }
            required
            errors={errors?.time}
          />
          <Field
            name="durationMinutes"
            type="number"
            label={t("event.duration")}
            defaultValue={event?.durationMinutes ?? 60}
            min={limits.durationMin}
            max={limits.durationMax}
            step={1}
            required
            errors={errors?.durationMinutes}
          />
          <TextareaField
            name="note"
            label={t("event.note")}
            defaultValue={event?.note ?? ""}
            maxLength={limits.textMax}
            errors={errors?.note}
          />
          {state.error && <p role="alert">{state.error}</p>}
          <div className="form-actions">
            <button className="button button-primary" type="submit">
              {t("form.save")}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={onClose}
            >
              {t("form.cancel")}
            </button>
          </div>
        </fieldset>
      </form>
      {event && (
        <DeleteForm
          id={event.id}
          title={event.title}
          state={deleteState}
          submit={deleteSubmit}
          pending={pending}
        />
      )}
    </FormDialog>
  );
}
