import { test, expect } from "@playwright/test";
for (const locale of ["en", "es", "it"])
  for (const width of [360, 1360]) {
    test(`Telegram settings ${locale} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/?telegram&locale=${locale}&state=connected&role=coach&username=long_username_for_wrapping`,
      );
      await page.locator('[aria-haspopup="dialog"]').click();
      await expect(page.locator('textarea[name="bio"]')).toHaveValue(
        "Strength coach",
      );
      await expect(
        page.locator('input[name="acceptingClients"]'),
      ).toBeChecked();
      const section = page.locator(".telegram-settings");
      await expect(section).toContainText("long_username_for_wrapping");
      expect(
        await page
          .locator("dialog")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await page.screenshot({
        path: `../../.superpowers/sdd/telegram-assistant/settings-${locale}-${width}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(page.locator("dialog")).not.toBeVisible();
    });
  }
test("requests, reopens without a raw token, and cancels a link", async ({
  page,
}) => {
  await page.goto("/?telegram&locale=en");
  await page.locator('[aria-haspopup="dialog"]').click();
  await page
    .getByRole("button", { name: "Connect Telegram", exact: true })
    .click();
  await expect(page.getByRole("link", { name: "Open Telegram" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator('[aria-haspopup="dialog"]').click();
  await expect(
    page.getByRole("button", { name: "Generate new link" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Telegram" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Cancel link" }).click();
  await expect(
    page.getByRole("button", { name: "Connect Telegram", exact: true }),
  ).toBeVisible();
});
