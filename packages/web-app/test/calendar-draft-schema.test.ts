import { expect, it } from "vitest";
import { calendarOperationsSchema as schema } from "../lib/mcp/schemas";
const id = "11111111-1111-4111-8111-111111111111";
const item = {
  op: "createItem",
  tempId: "base",
  kind: "training",
  title: " Strength ",
};
it("accepts all nine operations and preserves omission across reparsing", () => {
  const operations = [
    item,
    {
      op: "createCheckpoint",
      itemRef: "base",
      date: "2026-09-20",
      title: "Review",
      note: "  ",
    },
    {
      op: "createPeriod",
      itemRef: id,
      startDate: "2026-09-20",
      endDate: "2026-09-21",
      title: "Phase",
    },
    { op: "updateItem", id, title: " New " },
    { op: "updateCheckpoint", id, status: "done" },
    { op: "updatePeriod", id, startDate: "2026-09-21" },
    { op: "deleteItem", id },
    { op: "deleteCheckpoint", id: "22222222-2222-4222-8222-222222222222" },
    { op: "deletePeriod", id: "33333333-3333-4333-8333-333333333333" },
  ];
  const parsed = schema.parse(operations);
  expect(parsed[0]).toMatchObject({ title: "Strength" });
  expect(parsed[1]).toMatchObject({ note: null });
  expect(parsed[3]).toEqual({ op: "updateItem", id, title: "New" });
  expect(schema.parse(parsed)).toEqual(parsed);
});
it.each(["updateItem", "updateCheckpoint", "updatePeriod"])(
  "rejects empty %s",
  (op) => {
    expect(schema.safeParse([{ op, id }]).success).toBe(false);
    expect(schema.safeParse([{ op, id, title: undefined }]).success).toBe(
      false,
    );
  },
);
it.each(
  [
    [],
    Array.from({ length: 101 }, () => ({ op: "updateItem", id, title: "X" })),
    [item, item],
    [{ ...item, tempId: "" }],
    [{ ...item, tempId: "a".repeat(33) }],
    [{ ...item, tempId: "bad space" }],
    [{ ...item, kind: "invalid" }],
    [{ ...item, title: " " }],
    [{ ...item, title: "x".repeat(121) }],
    [{ ...item, description: "x".repeat(2001) }],
    [
      {
        op: "createCheckpoint",
        itemRef: "base",
        date: "2026-09-20",
        title: "X",
      },
      item,
    ],
    [{ op: "updateItem", id: "base", title: "X" }],
    [
      { op: "deleteItem", id },
      { op: "updateItem", id, title: "X" },
    ],
    [
      { op: "deleteItem", id },
      { op: "deleteItem", id },
    ],
    [
      { op: "deleteItem", id },
      { op: "createCheckpoint", itemRef: id, title: "X", date: "2026-09-20" },
    ],
    [
      {
        op: "createPeriod",
        itemRef: id,
        title: "X",
        startDate: "2026-09-21",
        endDate: "2026-09-20",
      },
    ],
    [{ op: "updateCheckpoint", id, status: "invalid" }],
    [{ op: "updateCheckpoint", id, date: "2026-02-29" }],
    [{ op: "updateCheckpoint", id, date: "2026-2-01" }],
    [{ op: "updateItem", id, title: "X", engagementId: id }],
  ].map((operations) => [operations]),
)("rejects invalid operation list %#", (operations) => {
  expect(schema.safeParse(operations).success).toBe(false);
});
it("accepts the operation limit, leap days, backward references and clearing text", () => {
  expect(
    schema.parse(
      Array.from({ length: 100 }, () => ({ op: "updateItem", id, title: "X" })),
    ),
  ).toHaveLength(100);
  expect(
    schema.parse([{ op: "updateCheckpoint", id, date: "2028-02-29" }])[0],
  ).toHaveProperty("date", "2028-02-29");
  expect(schema.parse([{ op: "updateItem", id, description: " " }])[0]).toEqual(
    { op: "updateItem", id, description: null },
  );
});
it("canonicalizes UUIDs so mixed-case references cannot bypass deletion ordering", () => {
  const lower = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    upper = lower.toUpperCase();
  expect(
    schema.safeParse([
      { op: "deleteItem", id: lower },
      { op: "updateItem", id: upper, title: "X" },
    ]).success,
  ).toBe(false);
  expect(
    schema.parse([
      {
        op: "createCheckpoint",
        itemRef: upper,
        title: "X",
        date: "2026-09-20",
      },
    ])[0],
  ).toHaveProperty("itemRef", lower);
});
it.each(["Item", "Checkpoint", "Period"])(
  "normalizes deletion ids before resolving %s targets or tracking deletions",
  (kind) => {
    const lower = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const upper = lower.toUpperCase();
    const op = `delete${kind}`;
    expect(schema.parse([{ op, id: upper }])[0]).toEqual({ op, id: lower });
    expect(
      schema.safeParse([
        { op, id: upper },
        { op, id: lower },
      ]).success,
    ).toBe(false);
  },
);
