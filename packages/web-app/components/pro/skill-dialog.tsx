"use client";
import { useEffect } from "react";
import { useT } from "@/components/i18n/provider";
import { Field, TextareaField } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { useFormAction } from "@/components/forms/use-form-action";
import { saveCoachSkill } from "@/lib/pro/skill-actions";
import { limits, skillNamePattern } from "@/lib/pro/schemas";
import type { CoachSkill } from "@/lib/pro/types";
export function SkillDialog({
  skill,
  onClose,
}: {
  skill?: CoachSkill;
  onClose: () => void;
}) {
  const t = useT("pro"),
    [state, submit, pending, formRef] = useFormAction(saveCoachSkill);
  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);
  const errors = state.fields;
  return (
    <FormDialog
      open
      busy={pending}
      title={t(skill ? "skills.edit" : "skills.new")}
      onClose={onClose}
    >
      <form ref={formRef} action={submit} className="pro-form">
        <fieldset disabled={pending}>
          {skill && <input type="hidden" name="id" value={skill.id} />}
          <Field
            name="name"
            label={t("skills.name")}
            help={t("skills.nameHelp")}
            defaultValue={skill?.name}
            required
            maxLength={limits.skillNameMax}
            pattern={skillNamePattern.source}
            autoCapitalize="none"
            spellCheck={false}
            errors={errors?.name}
          />
          <TextareaField
            name="description"
            label={t("skills.description")}
            help={t("skills.descriptionHelp")}
            defaultValue={skill?.description ?? ""}
            required
            rows={3}
            maxLength={limits.skillDescriptionMax}
            errors={errors?.description}
          />
          <TextareaField
            name="instructions"
            label={t("skills.instructions")}
            help={t("skills.instructionsHelp")}
            defaultValue={skill?.instructions ?? ""}
            required
            rows={12}
            maxLength={limits.skillInstructionsMax}
            errors={errors?.instructions}
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
    </FormDialog>
  );
}
