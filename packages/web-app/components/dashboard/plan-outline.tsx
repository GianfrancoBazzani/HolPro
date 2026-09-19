"use client";
import type { ReactNode } from "react";
import type {
  CalendarItem,
  CalendarCheckpoint,
  CalendarPeriod,
} from "@/lib/calendar/types";
import { dayDate } from "@/lib/calendar/dates";
import { useLocale, useT } from "@/components/i18n/provider";
import { StatusDot } from "./timeline-controls";
export type OutlineProps = {
  items: CalendarItem[];
  engagements: { id: string; coachName: string }[];
  slots?: {
    item?: (item: CalendarItem) => ReactNode;
    checkpoint?: (
      checkpoint: CalendarCheckpoint,
      item: CalendarItem,
    ) => ReactNode;
    period?: (period: CalendarPeriod, item: CalendarItem) => ReactNode;
    footer?: () => ReactNode;
  };
};
export function PlanOutline({ items, engagements, slots }: OutlineProps) {
  const t = useT("dashboard"),
    locale = useLocale();
  const dates = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  return (
    <div className="plan-outline">
      {!items.length && !slots?.footer && <p>{t("empty.noItems")}</p>}
      {[...items]
        .sort(
          (a, b) =>
            a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
        )
        .map((item) => (
          <article key={item.id} className="outline-item">
            <header>
              <div className="calendar-kind">
                {t(`kind.${item.kind}`)}
                {engagements.length >= 2 && (
                  <span>
                    {" "}
                    ·{" "}
                    {
                      engagements.find((e) => e.id === item.engagementId)
                        ?.coachName
                    }
                  </span>
                )}
              </div>
              <h3>{item.title}</h3>
              {item.description && <p>{item.description}</p>}
              {slots?.item?.(item)}
            </header>
            {!!item.periods.length && (
              <section>
                <h4>{t("outline.periods")}</h4>
                <ul>
                  {[...item.periods]
                    .sort(
                      (a, b) =>
                        a.startDate.localeCompare(b.startDate) ||
                        a.id.localeCompare(b.id),
                    )
                    .map((period) => (
                      <li key={period.id}>
                        <strong>{period.title}</strong>
                        <span>
                          {dates.formatRange(
                            dayDate(period.startDate),
                            dayDate(period.endDate),
                          )}
                        </span>
                        {period.note && <p>{period.note}</p>}
                        {slots?.period?.(period, item)}
                      </li>
                    ))}
                </ul>
              </section>
            )}
            {!!item.checkpoints.length && (
              <section>
                <h4>{t("outline.checkpoints")}</h4>
                <ul>
                  {[...item.checkpoints]
                    .sort(
                      (a, b) =>
                        a.date.localeCompare(b.date) ||
                        a.id.localeCompare(b.id),
                    )
                    .map((cp) => (
                      <li key={cp.id}>
                        <div className="outline-status">
                          <StatusDot status={cp.status} />
                          <span>{t(`status.${cp.status}`)}</span>
                          <time dateTime={cp.date}>
                            {dates.format(dayDate(cp.date))}
                          </time>
                        </div>
                        <strong>{cp.title}</strong>
                        {cp.note && <p>{cp.note}</p>}
                        {slots?.checkpoint?.(cp, item)}
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </article>
        ))}
      {slots?.footer?.()}
    </div>
  );
}
