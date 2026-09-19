"use client";
import { useState } from "react";
import Link from "next/link";
import { useLocale, useT } from "@/components/i18n/provider";
import { dayDate } from "@/lib/calendar/dates";
import { shiftMonth } from "@/lib/pro/dates";
import type { AgendaData, AgendaEvent } from "@/lib/pro/types";
import { EventDialog } from "./event-dialog";
export function Agenda({
  data,
  clients,
}: {
  data: AgendaData;
  clients: { engagementId: string; name: string }[];
}) {
  const t = useT("pro"),
    locale = useLocale();
  const [selected, setSelected] = useState<string | null>(
    data.weeks.flat().includes(data.today) ? data.today : null,
  );
  const [editing, setEditing] = useState<AgendaEvent | "new" | null>(null);
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: "UTC",
  });
  const month = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dayDate(`${data.month}-01`));
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  const dayNumber = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone: "UTC",
  });
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: data.timezone,
  });
  const numbers = new Intl.NumberFormat(locale);
  const label = (event: AgendaEvent) =>
    t(event.clientName ? "agenda.eventLabelClient" : "agenda.eventLabel", {
      time: time.format(new Date(event.startsAt)),
      title: event.title,
      kind: t(`kind.${event.kind}`),
      client: event.clientName ?? "",
    });
  const empty = !Object.entries(data.events).some(
    ([day, events]) => day.startsWith(data.month) && events.length,
  );
  const previous = shiftMonth(data.month, -1),
    next = shiftMonth(data.month, 1);
  return (
    <section
      className="dashboard-panel agenda"
      aria-labelledby="agenda-heading"
    >
      <div className="agenda-heading">
        <div>
          <span className="eyebrow">{t("agenda.eyebrow")}</span>
          <h1 id="agenda-heading">{t("agenda.title")}</h1>
        </div>
        <button
          className="button button-primary"
          onClick={() => setEditing("new")}
        >
          {t("agenda.add")}
        </button>
      </div>
      <p className="agenda-timezone">
        {t("agenda.timezone", { timezone: data.timezone })}
      </p>
      <nav className="agenda-navigation" aria-label={t("agenda.eyebrow")}>
        <Link className="calendar-chip" href="/pro">
          {t("agenda.today")}
        </Link>
        <div className="agenda-month-nav">
          {previous >= "1001-01" && (
            <Link
              className="calendar-chip agenda-nav-arrow"
              href={`/pro?month=${previous}`}
              aria-label={t("agenda.previous")}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="m15 6-6 6 6 6" />
              </svg>
            </Link>
          )}
          <h2>{month}</h2>
          {next <= "9998-12" && (
            <Link
              className="calendar-chip agenda-nav-arrow"
              href={`/pro?month=${next}`}
              aria-label={t("agenda.next")}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          )}
        </div>
      </nav>
      {empty && <p>{t("agenda.empty")}</p>}
      <div className="agenda-grid-wrap">
        <table className="agenda-grid">
          <caption className="sr-only">
            {t("agenda.caption", { month })}
          </caption>
          <thead>
            <tr>
              {data.weeks[0].map((day) => (
                <th scope="col" key={day}>
                  {weekday.format(dayDate(day))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.weeks.map((week) => (
              <tr key={week[0]}>
                {week.map((day) => {
                  const events = data.events[day] ?? [],
                    fullDate = date.format(dayDate(day));
                  return (
                    <td
                      key={day}
                      className={
                        day.startsWith(data.month)
                          ? undefined
                          : "agenda-outside"
                      }
                    >
                      <div className="agenda-cell">
                        <button
                          className="agenda-day"
                          onClick={() => setSelected(day)}
                          aria-pressed={selected === day}
                          aria-current={day === data.today ? "date" : undefined}
                          aria-label={t(
                            events.length === 0
                              ? "agenda.dayEmpty"
                              : events.length === 1
                                ? "agenda.dayOne"
                                : "agenda.dayMany",
                            {
                              date: fullDate,
                              count: numbers.format(events.length),
                            },
                          )}
                        >
                          {dayNumber.format(dayDate(day))}
                          {events.length > 0 && (
                            <span className="agenda-count" aria-hidden="true">
                              {numbers.format(events.length)}
                            </span>
                          )}
                        </button>
                        <div className="agenda-chips">
                          {events.slice(0, 3).map((event) => (
                            <button
                              key={event.id}
                              className="agenda-event"
                              aria-label={label(event)}
                              onClick={() => setEditing(event)}
                            >
                              <span>
                                {time.format(new Date(event.startsAt))}
                              </span>
                              <strong>{event.title}</strong>
                              {event.clientName && (
                                <span>{event.clientName}</span>
                              )}
                            </button>
                          ))}
                          {events.length > 3 && (
                            <button
                              className="agenda-more"
                              onClick={() => setSelected(day)}
                            >
                              {t("agenda.more", {
                                count: numbers.format(events.length - 3),
                              })}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="agenda-details" aria-live="polite">
        {selected && (
          <>
            <h3>
              {t("agenda.details", { date: date.format(dayDate(selected)) })}
            </h3>
            {(data.events[selected] ?? []).length ? (
              (data.events[selected] ?? []).map((event) => (
                <button
                  className="agenda-detail"
                  key={event.id}
                  onClick={() => setEditing(event)}
                >
                  {label(event)}
                </button>
              ))
            ) : (
              <p>
                {t("agenda.selectedEmpty", {
                  date: date.format(dayDate(selected)),
                })}
              </p>
            )}
          </>
        )}
      </div>
      {editing && (
        <EventDialog
          key={editing === "new" ? "new" : editing.id}
          event={editing === "new" ? undefined : editing}
          day={selected ?? data.today}
          timezone={data.timezone}
          clients={clients}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
