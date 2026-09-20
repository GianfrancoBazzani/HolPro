import { translator, type Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { PlanView } from "@/lib/plans/view";
import { portals, type PortalKey } from "@/lib/auth/portals";
import { SelectField } from "@/components/forms/field";
import Link from "next/link";
import { coachEngagementHref } from "@/lib/notifications/links";
import { PlanDraftControls } from "./plan-draft-controls";
import { PlanViewer } from "./plan-viewer";
import "./plans.css";
export function PlanArtifact({
  view,
  role,
  locale,
  timezone,
  messages,
  month,
  editable = true,
}: {
  view: PlanView;
  role: PortalKey;
  locale: Locale;
  timezone: string;
  messages: Dictionary["dashboard"];
  month?: string;
  editable?: boolean;
}) {
  const t = translator({ dashboard: messages }, "dashboard"),
    multipleEngagements =
      new Set(view.plans.map((p) => p.engagementId)).size > 1;
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(value));
  const homePath = role === "coach" && view.engagementId
    ? coachEngagementHref(view.engagementId)
    : portals[role].homePath;
  const previewHref = (preview: string) => {
    const params = new URLSearchParams({ preview });
    if (view.selected) params.set("plan", view.selected.planId);
    if (month) params.set("month", month);
    return `${homePath}?${params}`;
  };
  return (
    <section
      className="dashboard-panel plan-artifact"
      aria-labelledby="plan-document-heading"
    >
      <h2 id="plan-document-heading">{t("plan.title")}</h2>
      {view.plans.length > 1 && (
        <form
          className="plan-selectors"
          action={homePath}
          method="get"
        >
          {month && <input type="hidden" name="month" value={month} />}
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
                    : role === "coach" && p.draftSubmittedAt
                      ? t("plan.optionPending", { title: p.title })
                      : p.title,
              }))}
            />
          )}
          <button className="button button-secondary" type="submit">
            {t("plan.view")}
          </button>
        </form>
      )}
      {role === "coach" && view.draft && (
        <div className="plan-review">
          <p>
            {view.selected && view.selected.versionNumber > 0
              ? t("plan.draftStatus", {
                  date: date(view.draft.submittedAt),
                  versionNumber: new Intl.NumberFormat(locale).format(
                    view.selected.versionNumber,
                  ),
                })
              : t("plan.draftStatusNew")}
          </p>
          {editable && (
            <PlanDraftControls
              key={view.draft.draftId}
              planId={view.draft.planId}
              draftId={view.draft.draftId}
              published={(view.selected?.versionNumber ?? 0) > 0}
            />
          )}
          {(view.selected?.versionNumber ?? 0) > 0 && (
            <nav
              className="plan-review-actions"
              aria-label={t("plan.previewLabel")}
            >
              <Link
                className="calendar-chip"
                href={previewHref("draft")}
                aria-current={
                  view.content?.kind === "draft" ? "page" : undefined
                }
              >
                {t("plan.previewDraft")}
              </Link>
              <Link
                className="calendar-chip"
                href={previewHref("published")}
                aria-current={
                  view.content?.kind === "published" ? "page" : undefined
                }
              >
                {t("plan.previewPublished")}
              </Link>
            </nav>
          )}
        </div>
      )}
      {view.content && view.framed ? (
        <>
          <h3>{view.content.title}</h3>
          <p>
            {view.content.kind === "draft"
              ? t("plan.draftVersion", {
                  submittedAt: date(view.content.submittedAt),
                })
              : t("plan.version", {
                  versionNumber: new Intl.NumberFormat(locale).format(
                    view.content.versionNumber,
                  ),
                  publishedAt: date(view.content.publishedAt),
                })}
          </p>
          {view.content.kind === "draft" && (
            <p className="plan-preview-banner">{t("plan.previewBanner")}</p>
          )}
          <PlanViewer
            key={`${view.content.planId}:${view.content.kind === "draft" ? view.content.draftId : view.content.versionNumber}`}
            framed={view.framed}
          />
        </>
      ) : (
        <p>{t("plan.empty")}</p>
      )}
    </section>
  );
}
