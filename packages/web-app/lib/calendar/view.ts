import { daysBetween } from "./dates";
type Row = {
  id: string;
  engagementId: string;
  kind: string;
  createdAt: string;
  startedAt: string;
};
export function orderRows<T extends Row>(items: T[], rowOrder: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];
  for (const id of rowOrder) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  }
  return [
    ...ordered,
    ...[...byId.values()].sort(
      (a, b) =>
        a.startedAt.localeCompare(b.startedAt) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    ),
  ];
}
export function visibleRows<T extends { engagementId: string; kind: string }>(
  items: T[],
  hidden: { engagements: string[]; kinds: string[] },
): T[] {
  return items.filter(
    (item) =>
      !hidden.engagements.includes(item.engagementId) &&
      !hidden.kinds.includes(item.kind),
  );
}
export function moveRow(
  fullOrder: string[],
  visibleIds: string[],
  itemId: string,
  direction: "up" | "down",
): string[] {
  const index = visibleIds.indexOf(itemId);
  if (index < 0) return fullOrder;
  const neighbour = visibleIds[index + (direction === "up" ? -1 : 1)];
  if (!neighbour) return fullOrder;
  const a = fullOrder.indexOf(itemId),
    b = fullOrder.indexOf(neighbour);
  if (a < 0 || b < 0) return fullOrder;
  const result = [...fullOrder];
  [result[a], result[b]] = [result[b], result[a]];
  return result;
}
export function stackPeriods<
  T extends { id: string; startDate: string; endDate: string },
>(periods: T[], window: { start: string; end: string }) {
  const ends: string[] = [];
  return periods
    .filter((p) => p.endDate >= window.start && p.startDate <= window.end)
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id),
    )
    .map((period) => {
      const start =
        period.startDate < window.start ? window.start : period.startDate;
      const end = period.endDate > window.end ? window.end : period.endDate;
      let lane = ends.findIndex((previous) => previous < start);
      if (lane < 0) lane = ends.length;
      ends[lane] = end;
      return {
        ...period,
        lane,
        startIndex: daysBetween(window.start, start),
        endIndex: daysBetween(window.start, end),
        clippedStart: period.startDate < start,
        clippedEnd: period.endDate > end,
      };
    });
}
