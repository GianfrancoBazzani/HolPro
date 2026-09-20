"use client";
import { useCallback, useState } from "react";
import { useLocale, useT } from "@/components/i18n/provider";
import { deleteCoachSkill } from "@/lib/pro/skill-actions";
import { limits } from "@/lib/pro/schemas";
import type { CoachSkill } from "@/lib/pro/types";
import { DeleteControl } from "./delete-control";
import { SkillDialog } from "./skill-dialog";
export function SkillsManager({
  skills,
  timezone,
}: {
  skills: CoachSkill[];
  timezone: string;
}) {
  const t = useT("pro"),
    locale = useLocale();
  const [editing, setEditing] = useState<CoachSkill | "new" | null>(null);
  const close = useCallback(() => setEditing(null), []);
  const full = skills.length >= limits.skillsMax;
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: timezone,
  });
  return (
    <>
      <div className="form-actions skills-toolbar">
        <button
          className="button button-primary"
          type="button"
          disabled={full}
          onClick={() => setEditing("new")}
        >
          {t("skills.new")}
        </button>
        {full && <p>{t("skills.full", { skillsMax: limits.skillsMax })}</p>}
      </div>
      {skills.length ? (
        <ul className="skills-list">
          {skills.map((skill) => (
            <li key={skill.id} className="skill-card">
              <div className="skill-card-body">
                <h2>{skill.name}</h2>
                <p>{skill.description}</p>
                <p className="form-help">
                  {t("skills.updated", {
                    date: date.format(new Date(skill.updatedAt)),
                  })}
                </p>
              </div>
              <div className="skill-card-actions">
                <button
                  className="calendar-chip"
                  type="button"
                  aria-label={t("skills.editLabel", { name: skill.name })}
                  onClick={() => setEditing(skill)}
                >
                  {t("plan.edit")}
                </button>
                <DeleteControl
                  action={deleteCoachSkill}
                  id={skill.id}
                  title={skill.name}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("skills.empty")}</p>
      )}
      {editing && (
        <SkillDialog
          skill={editing === "new" ? undefined : editing}
          onClose={close}
        />
      )}
    </>
  );
}
