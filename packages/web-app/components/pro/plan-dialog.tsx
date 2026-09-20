"use client";
import { useEffect } from "react";
import { itemKinds, checkpointStatuses } from "@holpro/db/schema";
import type {
  CalendarItem,
  CalendarCheckpoint,
  CalendarPeriod,
} from "@/lib/calendar/types";
import { useT } from "@/components/i18n/provider";
import { Field, SelectField, TextareaField } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { useFormAction } from "@/components/forms/use-form-action";
import {
  savePlanItem,
  savePlanCheckpoint,
  savePlanPeriod,
} from "@/lib/pro/plan-actions";
import { limits } from "@/lib/pro/schemas";
export type PlanTarget =
  | { kind: "item"; parentId: string; value?: CalendarItem }
  | { kind: "checkpoint"; parentId: string; value?: CalendarCheckpoint }
  | { kind: "period"; parentId: string; value?: CalendarPeriod };
const planActions = {
  item: savePlanItem,
  checkpoint: savePlanCheckpoint,
  period: savePlanPeriod,
} satisfies Record<PlanTarget["kind"], typeof savePlanItem>;
export function PlanDialog({
  target,
  onClose,
}: {
  target: PlanTarget;
  onClose: () => void;
}) {
  const t = useT("pro"),
    d = useT("dashboard");
  const [state, submit, pending, formRef] = useFormAction(
    planActions[target.kind],
  );
  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);
  const errors = state.fields;
  return (
    <FormDialog
      open
      busy={pending}
      title={t(`${target.kind}.${target.value ? "edit" : "new"}`)}
      onClose={onClose}
    >
      <form ref={formRef} action={submit} className="pro-form">
        <fieldset disabled={pending}>
          {target.value ? (
            <input type="hidden" name="id" value={target.value.id} />
          ) : (
            <input
              type="hidden"
              name={target.kind === "item" ? "engagementId" : "itemId"}
              value={target.parentId}
            />
          )}
          <Field
            name="title"
            label={t(`${target.kind}.title`)}
            defaultValue={target.value?.title}
            required
            maxLength={limits.titleMax}
            errors={errors?.title}
          />
          {target.kind === "item" ? (
            <>
              <SelectField
                name="kind"
                label={t("item.kind")}
                options={itemKinds.map((kind) => ({
                  value: kind,
                  label: d(`kind.${kind}`),
                }))}
                defaultValue={target.value?.kind ?? "training"}
                errors={errors?.kind}
              />
              <TextareaField
                name="description"
                label={t("item.description")}
                defaultValue={target.value?.description ?? ""}
                maxLength={limits.textMax}
                errors={errors?.description}
              />
            </>
          ) : target.kind === "checkpoint" ? (
            <>
              <Field
                name="date"
                type="date"
                label={t("checkpoint.date")}
                defaultValue={target.value?.date}
                min="1000-01-01"
                max="9999-12-31"
                required
                errors={errors?.date}
              />
              <SelectField
                name="status"
                label={t("checkpoint.status")}
                options={checkpointStatuses.map((status) => ({
                  value: status,
                  label: d(`status.${status}`),
                }))}
                defaultValue={target.value?.status ?? "planned"}
                errors={errors?.status}
              />
            </>
          ) : (
            <>
              <Field
                name="startDate"
                type="date"
                label={t("period.start")}
                defaultValue={target.value?.startDate}
                min="1000-01-01"
                max="9999-12-31"
                required
                errors={errors?.startDate}
              />
              <Field
                name="endDate"
                type="date"
                label={t("period.end")}
                defaultValue={target.value?.endDate}
                min="1000-01-01"
                max="9999-12-31"
                required
                errors={errors?.endDate}
              />
            </>
          )}
          {target.kind !== "item" && (
            <TextareaField
              name="note"
              label={t(`${target.kind}.note`)}
              defaultValue={target.value?.note ?? ""}
              maxLength={limits.textMax}
              errors={errors?.note}
            />
          )}{" "}
          {state.error && <p role="alert">{state.error}</p>}
          <div className="form-actions">
            <button type="submit" className="button button-primary">
              {t("form.save")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              {t("form.cancel")}
            </button>
          </div>
        </fieldset>
      </form>
    </FormDialog>
  );
}
