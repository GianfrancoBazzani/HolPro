import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("Cancel and Escape restore focus; reopening starts fresh", async ({
  page,
}) => {
  const add = page.getByRole("button", { name: "Add", exact: true });
  await add.click();
  await page.getByLabel("Title", { exact: true }).fill("Unsaved");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(add).toBeFocused();
  await add.click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(add).toBeFocused();
});
test("event errors retain input and pending saves cannot be dismissed", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Keep my title");
  await page.getByLabel("Time", { exact: true }).fill("15:00");
  await page.getByLabel("Note", { exact: true }).fill("Keep my note");
  await page.getByLabel("Kind", { exact: true }).selectOption("event");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Database unavailable");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Keep my title",
  );
  await expect(page.getByLabel("Note", { exact: true })).toHaveValue(
    "Keep my note",
  );
  await expect(page.getByLabel("Kind", { exact: true })).toHaveValue("event");
});
test("plan errors retain dates, title and note", async ({ page }) => {
  await page.getByRole("button", { name: "Add period", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Keep phase");
  await page.getByLabel("Start date").fill("2026-09-20");
  await page.getByLabel("End date").fill("2026-09-19");
  await page.getByLabel("Note", { exact: true }).fill("Keep details");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Keep phase",
  );
  await expect(page.getByLabel("Start date")).toHaveValue("2026-09-20");
  await expect(page.getByLabel("Note", { exact: true })).toHaveValue(
    "Keep details",
  );
});
test("pending deletion prevents a concurrent save or dismissal", async ({
  page,
}) => {
  await page.locator(".agenda-event").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete Planning session" })
    .click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Database unavailable");
});
for (const locale of ["en", "es", "it"])
  for (const width of [360, 1360])
    test(`${locale} fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/?locale=${locale}`);
      await expect(page.locator(".agenda")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator(".agenda-event").first())[
        width === 360 ? "toBeHidden" : "toBeVisible"
      ]();
      await page.screenshot({
        path: test.info().outputPath(`${locale}-${width}.png`),
        fullPage: true,
      });
    });

test("successful save closes the dialog and restores its opener", async ({
  page,
}) => {
  await page.goto("/?success");
  const add = page.getByRole("button", { name: "Add", exact: true });
  await add.click();
  await page.getByLabel("Title", { exact: true }).fill("New event");
  await page.getByLabel("Time", { exact: true }).fill("15:00");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(add).toBeFocused();
  await add.click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
});

test("delete only submits after explicit confirmation", async ({ page }) => {
  await page.locator(".agenda-event").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete Planning session" })
    .click();
  expect(
    await page.evaluate(() => document.documentElement.dataset.deleteRequests),
  ).toBeUndefined();
  await expect(
    page.getByRole("button", { name: "Confirm delete", exact: true }),
  ).toBeEnabled();
});
