import { expect, test } from "@playwright/test";
test("keeps approved calendar descriptions and period notes available without an outline", async ({
  page,
}) => {
  await page.goto("/?calendar-details=1");
  await page.getByRole("button", { name: "View details for Strength" }).click();
  await expect(page.locator(".calendar-details")).toContainText(
    "Three sessions each week.",
  );
  await page
    .getByRole("button", { name: "View details for Base phase" })
    .click();
  await expect(page.locator(".calendar-details")).toContainText(
    "Keep the first week gentle.",
  );
  await expect(page.locator(".calendar-details")).toContainText("September 21");
  await page
    .getByRole("button", { name: "View details for Base phase" })
    .click();
  await expect(page.locator(".calendar-details")).toBeEmpty();
});
