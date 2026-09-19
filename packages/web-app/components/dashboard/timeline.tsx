"use client";
import { useRef, useState, useTransition, type CSSProperties } from "react";
import { useLocale, useT } from "@/components/i18n/provider";
import {
  computeWindow,
  dayColumns,
  monthSpans,
  dayDate,
} from "@/lib/calendar/dates";
import {
  orderRows,
  visibleRows,
  moveRow,
  stackPeriods,
} from "@/lib/calendar/view";
import { createSaveQueue } from "@/lib/calendar/save-queue";
import type { CalendarData } from "@/lib/calendar/types";
import type { CalendarPreferences } from "@/lib/calendar/schemas";
import { TimelineControls, StatusDot } from "./timeline-controls";
type TimelineProps = {
  data: CalendarData;
  today: string;
  onSave?: (preferences: CalendarPreferences) => Promise<{ ok: boolean }>;
};
export function Timeline(props: TimelineProps) {
  return props.onSave ? (
    <PersistentTimeline {...props} onSave={props.onSave} />
  ) : (
    <LocalTimeline {...props} />
  );
}
function LocalTimeline({ data, today }: TimelineProps) {
  const [preferences, change] = useState(data.preferences);
  return (
    <TimelineView
      data={data}
      today={today}
      preferences={preferences}
      change={change}
    />
  );
}
function PersistentTimeline({
  data,
  today,
  onSave,
}: TimelineProps & { onSave: NonNullable<TimelineProps["onSave"]> }) {
  const [preferences, setPreferences] = useState(data.preferences);
  const [, setConfirmed] = useState(data.preferences);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [queue] = useState(() =>
    createSaveQueue(data.preferences, onSave, {
      shown: setPreferences,
      confirmed: setConfirmed,
      failed: setFailed,
    }),
  );
  const change = (next: CalendarPreferences) => {
    const saved = queue.update(next);
    startTransition(async () => {
      await saved;
    });
  };
  return (
    <TimelineView
      data={data}
      today={today}
      preferences={preferences}
      change={change}
      failed={failed}
      pending={pending}
    />
  );
}
function TimelineView({
  data,
  today,
  preferences,
  change,
  failed = false,
  pending = false,
}: Omit<TimelineProps, "onSave"> & {
  preferences: CalendarPreferences;
  change: (next: CalendarPreferences) => void;
  failed?: boolean;
  pending?: boolean;
}) {
  const t = useT("dashboard"),
    locale = useLocale();
  const [selection, setSelection] = useState<{
    itemId: string;
    date: string;
  } | null>(null);
  const todayCell = useRef<HTMLDivElement>(null);
  const entries = data.items.flatMap((item) => [
    ...item.checkpoints,
    ...item.periods,
  ]);
  const window = computeWindow(entries, today),
    columns = dayColumns(window);
  const enriched = data.items.map((item) => ({
    ...item,
    startedAt: data.engagements.find((e) => e.id === item.engagementId)!
      .startedAt,
  }));
  const ordered = orderRows(enriched, preferences.rowOrder);
  const rows = visibleRows(ordered, {
    engagements: data.engagements.length >= 2 ? preferences.hiddenEngagements : [],
    kinds: preferences.hiddenKinds,
  });
  const dayFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone: "UTC",
  });
  const weekdayFormat = new Intl.DateTimeFormat(locale, {
    weekday: "narrow",
    timeZone: "UTC",
  });
  const fullFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: "UTC",
  });
  const monthFormat = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const number = new Intl.NumberFormat(locale);
  const selected =
    rows
      .find((item) => item.id === selection?.itemId)
      ?.checkpoints.filter((cp) => cp.date === selection?.date) ?? [];
  const columnClass = (col: (typeof columns)[number]) =>
    `calendar-day${col.isWeekend ? " is-weekend" : ""}${col.isMonday ? " is-monday" : ""}${col.date === today ? " is-today" : ""}`;
  if (!data.engagements.length) return <p>{t("empty.noEngagement")}</p>;
  return (
    <div className="calendar">
      <TimelineControls
        data={data}
        preferences={preferences}
        onChange={change}
        onToday={() =>
          todayCell.current?.scrollIntoView({
            inline: "center",
            block: "nearest",
          })
        }
      />
      {failed && (
        <p className="calendar-notice" role="status">
          {t("notice.saveFailed")}
        </p>
      )}
      {window.clipped && (
        <p className="calendar-notice">{t("notice.clipped")}</p>
      )}
      {!data.items.length ? (
        <p>{t("empty.noItems")}</p>
      ) : !rows.length ? (
        <p>{t("empty.allHidden")}</p>
      ) : (
        <>
          <div
            className="calendar-scroll"
            tabIndex={0}
            role="region"
            aria-label={t("calendar.eyebrow")}
          >
            <div
              className="calendar-grid"
              role="grid"
              aria-label={t("calendar.title")}
              aria-busy={pending}
              style={{ "--days": columns.length } as CSSProperties}
            >
              <div role="row" className="calendar-grid-row calendar-months">
                <div role="columnheader" className="calendar-corner" />
                {monthSpans(columns).map((span) => (
                  <div
                    role="columnheader"
                    className="calendar-month"
                    key={span.month}
                    aria-colspan={span.length}
                    style={{
                      gridColumn: `${span.startIndex + 2} / span ${span.length}`,
                    }}
                  >
                    <span>
                      {monthFormat.format(dayDate(`${span.month}-01`))}
                    </span>
                  </div>
                ))}
              </div>
              <div role="row" className="calendar-grid-row calendar-days">
                <div role="columnheader" className="calendar-corner" />
                {columns.map((col) => (
                  <div
                    key={col.date}
                    role="columnheader"
                    className={columnClass(col)}
                    ref={col.date === today ? todayCell : undefined}
                    aria-current={col.date === today ? "date" : undefined}
                    aria-label={fullFormat.format(dayDate(col.date))}
                  >
                    <span>{weekdayFormat.format(dayDate(col.date))}</span>
                    <span>{dayFormat.format(dayDate(col.date))}</span>
                  </div>
                ))}
              </div>
              {rows.map((item, index) => {
                const periods = stackPeriods(item.periods, window);
                const laneCount = periods.reduce(
                  (max, p) => Math.max(max, p.lane + 1),
                  0,
                );
                const coach = data.engagements.find(
                  (e) => e.id === item.engagementId,
                )!;
                return (
                  <div
                    role="row"
                    className="calendar-grid-row calendar-item"
                    key={item.id}
                  >
                    <div role="rowheader" className="calendar-row-label">
                      <strong>{item.title}</strong>
                      <span className="calendar-kind">
                        {t(`kind.${item.kind}`)}
                      </span>
                      {data.engagements.length >= 2 && (
                        <span className="calendar-coach">
                          {coach.coachName}
                        </span>
                      )}
                      <div className="calendar-move">
                        {(["up", "down"] as const).map((direction) => (
                          <button
                            key={direction}
                            disabled={
                              direction === "up"
                                ? index === 0
                                : index === rows.length - 1
                            }
                            aria-label={t(
                              direction === "up"
                                ? "row.moveUpLabel"
                                : "row.moveDownLabel",
                              { title: item.title },
                            )}
                            onClick={() =>
                              change({
                                ...preferences,
                                rowOrder: moveRow(
                                  ordered.map((r) => r.id),
                                  rows.map((r) => r.id),
                                  item.id,
                                  direction,
                                ),
                              })
                            }
                          >
                            {t(
                              direction === "up"
                                ? "row.moveUp"
                                : "row.moveDown",
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div
                      role="presentation"
                      className="calendar-track"
                      style={{
                        gridTemplateRows: `${laneCount ? `repeat(${laneCount}, 32px) ` : ""}minmax(48px, 1fr)`,
                      }}
                    >
                      {columns.map((col, i) => (
                        <div
                          aria-hidden="true"
                          key={col.date}
                          className={columnClass(col)}
                          style={{ gridColumn: i + 1, gridRow: "1 / -1" }}
                        />
                      ))}
                      {periods.map((period) => (
                        <div
                          role="gridcell"
                          key={period.id}
                          className={`calendar-period${period.clippedStart ? " clipped-start" : ""}${period.clippedEnd ? " clipped-end" : ""}`}
                          style={{
                            gridColumn: `${period.startIndex + 1} / ${period.endIndex + 2}`,
                            gridRow: period.lane + 1,
                          }}
                          title={period.title}
                        >
                          {period.title}
                        </div>
                      ))}
                      {columns.map((col, i) => {
                        const checkpoints = item.checkpoints.filter(
                          (cp) => cp.date === col.date,
                        );
                        const date = fullFormat.format(dayDate(col.date));
                        const label =
                          checkpoints.length === 1
                            ? t("checkpoint.label", {
                                title: checkpoints[0].title,
                                date,
                                status: t(`status.${checkpoints[0].status}`),
                              })
                            : t("checkpoint.multiLabel", {
                                count: number.format(checkpoints.length),
                                date,
                              });
                        const active =
                          selection?.itemId === item.id &&
                          selection.date === col.date;
                        return (
                          <div
                            role="gridcell"
                            className="calendar-cell"
                            key={col.date}
                            style={{
                              gridColumn: i + 1,
                              gridRow: laneCount + 1,
                            }}
                          >
                            {checkpoints.length > 0 && (
                              <button
                                className="calendar-checkpoint"
                                aria-label={label}
                                aria-pressed={active}
                                onClick={() =>
                                  setSelection(
                                    active
                                      ? null
                                      : { itemId: item.id, date: col.date },
                                  )
                                }
                              >
                                {checkpoints
                                  .slice(0, checkpoints.length > 2 ? 1 : 2)
                                  .map((cp) => (
                                    <StatusDot key={cp.id} status={cp.status} />
                                  ))}
                                {checkpoints.length > 2 && (
                                  <span>
                                    {t("checkpoint.more", {
                                      count: number.format(
                                        checkpoints.length - 1,
                                      ),
                                    })}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="calendar-details" aria-live="polite">
            {selected.map((cp) => (
              <div key={cp.id}>
                <strong>
                  {t("checkpoint.label", {
                    title: cp.title,
                    date: fullFormat.format(dayDate(cp.date)),
                    status: t(`status.${cp.status}`),
                  })}
                </strong>
                {cp.note && <p>{cp.note}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
