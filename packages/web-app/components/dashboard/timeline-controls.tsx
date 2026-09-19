"use client";
import {
  checkpointStatuses,
  itemKinds,
  type CheckpointStatus,
} from "@holpro/db/schema";
import { useT } from "@/components/i18n/provider";
import type { CalendarData } from "@/lib/calendar/types";
import type { CalendarPreferences } from "@/lib/calendar/schemas";
export function StatusDot({ status }: { status: CheckpointStatus }) {
  return (
    <span
      aria-hidden="true"
      className={`calendar-dot calendar-dot-${status}`}
    />
  );
}
export function TimelineControls({
  data,
  preferences,
  onChange,
  onToday,
}: {
  data: CalendarData;
  preferences: CalendarPreferences;
  onChange: (next: CalendarPreferences) => void;
  onToday: () => void;
}) {
  const t = useT("dashboard");
  const toggle = <T extends string>(values: T[], value: T) =>
    values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
  return (
    <div className="calendar-controls">
      <div className="calendar-chips">
        <button className="button button-secondary" onClick={onToday}>
          {t("controls.today")}
        </button>
        {data.engagements.length >= 2 &&
          data.engagements.map((e) => (
            <button
              className="calendar-chip"
              key={e.id}
              aria-pressed={!preferences.hiddenEngagements.includes(e.id)}
              onClick={() =>
                onChange({
                  ...preferences,
                  hiddenEngagements: toggle(
                    preferences.hiddenEngagements,
                    e.id,
                  ),
                })
              }
            >
              {e.coachName}
            </button>
          ))}
        {itemKinds
          .filter((kind) => data.items.some((item) => item.kind === kind))
          .map((kind) => (
            <button
              className="calendar-chip"
              key={kind}
              aria-pressed={!preferences.hiddenKinds.includes(kind)}
              onClick={() =>
                onChange({
                  ...preferences,
                  hiddenKinds: toggle(preferences.hiddenKinds, kind),
                })
              }
            >
              {t(`kind.${kind}`)}
            </button>
          ))}
      </div>
      <div className="calendar-legend">
        {checkpointStatuses.map((status) => (
          <span key={status}>
            <StatusDot status={status} />
            {t(`status.${status}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
