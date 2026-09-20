import type { CalendarDraft, CalendarOperation } from "@/lib/mcp/schemas";
import type { Locale } from "@/lib/i18n/config";
import { translator, type Dictionary } from "@/lib/i18n/dictionary";
import { safeTimezone, zonedToUtc } from "@/lib/pro/dates";
import { Rich } from "@/components/i18n/rich";
import { CalendarDraftControls } from "./calendar-draft-controls";

export function CalendarDraftPanel({
  draft,
  locale,
  timezone,
  messages,
}: {
  draft: CalendarDraft | null;
  locale: Locale;
  timezone: string;
  messages: Pick<Dictionary, "pro" | "dashboard">;
}) {
  if (!draft) return null;
  const t = translator(messages, "pro"),
    d = translator(messages, "dashboard");
  const zone = safeTimezone(timezone);
  const dates = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: zone,
  });
  // Calendar dates are wall dates, not UTC instants. Noon avoids midnight DST gaps.
  const day = (value: string) => dates.format(zonedToUtc(value, "12:00", zone));
  const details = (operation: CalendarOperation) => {
    const fields: [string, string][] = [];
    if ("title" in operation && operation.title !== undefined)
      fields.push([t("item.title"), operation.title]);
    if ("kind" in operation && operation.kind !== undefined)
      fields.push([t("item.kind"), d(`kind.${operation.kind}`)]);
    if ("description" in operation && operation.description !== undefined)
      fields.push([
        t("item.description"),
        operation.description ?? t("calendarDraft.cleared"),
      ]);
    if ("date" in operation && operation.date !== undefined)
      fields.push([t("checkpoint.date"), day(operation.date)]);
    if ("status" in operation && operation.status !== undefined)
      fields.push([t("checkpoint.status"), d(`status.${operation.status}`)]);
    if ("startDate" in operation && operation.startDate !== undefined)
      fields.push([t("period.start"), day(operation.startDate)]);
    if ("endDate" in operation && operation.endDate !== undefined)
      fields.push([t("period.end"), day(operation.endDate)]);
    if ("note" in operation && operation.note !== undefined)
      fields.push([
        t("checkpoint.note"),
        operation.note ?? t("calendarDraft.cleared"),
      ]);
    return fields;
  };
  return (
    <section
      className="dashboard-panel calendar-draft-panel"
      aria-labelledby="calendar-draft-heading"
    >
      <span className="eyebrow">{t("calendarDraft.eyebrow")}</span>
      <h2 id="calendar-draft-heading">{t("calendarDraft.title")}</h2>
      <p>
        {t("calendarDraft.submitted", {
          date: dates.format(new Date(draft.submittedAt)),
        })}
      </p>
      {draft.invalid ? (
        <p role="alert">{t("error.draftChanged")}</p>
      ) : (
        <p>
          {t(
            draft.operations.length === 1
              ? "calendarDraft.countOne"
              : "calendarDraft.countOther",
            {
              count: new Intl.NumberFormat(locale).format(
                draft.operations.length,
              ),
            },
          )}
        </p>
      )}
      <ol className="calendar-draft-operations">
        {draft.operations.map(
          (
            {
              operation,
              title,
              itemTitle,
              targetDate,
              targetStartDate,
              targetEndDate,
            },
            index,
          ) => {
            const unknown =
              title === null || ("itemRef" in operation && itemTitle === null);
            const values = {
              title: title ?? "",
              itemTitle: itemTitle ?? "",
              kind:
                "kind" in operation && operation.kind
                  ? d(`kind.${operation.kind}`)
                  : "",
              date:
                "date" in operation && operation.date
                  ? day(operation.date)
                  : "",
              startDate:
                "startDate" in operation && operation.startDate
                  ? day(operation.startDate)
                  : "",
              endDate:
                "endDate" in operation && operation.endDate
                  ? day(operation.endDate)
                  : "",
            };
            const fields = details(operation);
            return (
              <li key={index}>
                <p>
                  <Rich
                    text={
                      unknown
                        ? t("calendarDraft.op.unknown")
                        : t(`calendarDraft.op.${operation.op}`, values)
                    }
                  />
                </p>
                {targetDate && (
                  <p>
                    {t("calendarDraft.targetCheckpoint", {
                      date: day(targetDate),
                    })}
                  </p>
                )}
                {targetStartDate && targetEndDate && (
                  <p>
                    {t("calendarDraft.targetPeriod", {
                      startDate: day(targetStartDate),
                      endDate: day(targetEndDate),
                    })}
                  </p>
                )}
                {fields.length > 0 && (
                  <dl className="calendar-draft-fields">
                    {fields.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          },
        )}
      </ol>
      <CalendarDraftControls
        key={draft.draftId}
        engagementId={draft.engagementId}
        draftId={draft.draftId}
        invalid={draft.invalid}
      />
    </section>
  );
}
