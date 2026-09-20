import { translator, type Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { PlanView } from "@/lib/plans/view";
import { portals, type PortalKey } from "@/lib/auth/portals";
import { SelectField } from "@/components/forms/field";
import { PlanViewer } from "./plan-viewer";
import "./plans.css";
export function PlanArtifact({
  view,
  role,
  locale,
  timezone,
  messages,
  month,
}: {
  view: PlanView;
  role: PortalKey;
  locale: Locale;
  timezone: string;
  messages: Dictionary["dashboard"];
  month?: string;
}) {
  const t = translator({ dashboard: messages }, "dashboard"),
    multipleEngagements =
      new Set(view.plans.map((p) => p.engagementId)).size > 1;
  return (
    <section
      className="dashboard-panel plan-artifact"
      aria-labelledby="plan-document-heading"
    >
      <h2 id="plan-document-heading">{t("plan.title")}</h2>
      {(view.plans.length > 1 ||
        (role === "coach" && view.engagements.length > 0)) && (
        <form
          className="plan-selectors"
          action={portals[role].homePath}
          method="get"
        >
          {month && <input type="hidden" name="month" value={month} />}
          {role === "coach" && (
            <SelectField
              key={view.engagementId}
              name="engagement"
              label={t("plan.engagementLabel")}
              defaultValue={view.engagementId}
              options={view.engagements.map((e) => ({
                value: e.id,
                label: t("plan.engagementOption", {
                  name: e.coacheeName,
                  status: t(
                    e.status === "active"
                      ? "plan.statusActive"
                      : "plan.statusEnded",
                  ),
                }),
              }))}
            />
          )}
          {view.plans.length > 0 && (
            <SelectField
              key={view.selected?.planId}
              name="plan"
              label={t("plan.selectorLabel")}
              defaultValue={view.selected?.planId}
              options={view.plans.map((p) => ({
                value: p.planId,
                label:
                  role === "coachee" && multipleEngagements
                    ? t("plan.optionWithCoach", {
                        title: p.title,
                        coachName:
                          view.engagements.find((e) => e.id === p.engagementId)
                            ?.coachName ?? "",
                      })
                    : p.title,
              }))}
            />
          )}
          <button className="button button-primary" type="submit">
            {t("plan.view")}
          </button>
        </form>
      )}
      {view.content && view.framed ? (
        <>
          <h3>{view.content.title}</h3>
          <p>
            {t("plan.version", {
              versionNumber: new Intl.NumberFormat(locale).format(
                view.content.versionNumber,
              ),
              publishedAt: new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: timezone,
              }).format(new Date(view.content.publishedAt)),
            })}
          </p>
          <PlanViewer
            key={`${view.content.planId}:${view.content.versionNumber}`}
            framed={view.framed}
          />
        </>
      ) : (
        <p>{t("plan.empty")}</p>
      )}
    </section>
  );
}
