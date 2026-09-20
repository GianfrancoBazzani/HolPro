import { test, expect } from "@playwright/test";
test("requires confirmation to discard and sends the exact reviewed draft", async ({
  page,
}) => {
  await page.goto("/?calendar-draft=1");
  await page
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { calendarReview?: unknown }).calendarReview,
    ),
  ).toBeUndefined();
  await expect(
    page.getByText(
      "This removes the proposal. Your client’s calendar stays unchanged.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm discard", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm discard", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { calendarReview?: unknown })
            .calendarReview,
      ),
    )
    .toEqual({
      intent: "discard",
      engagementId: "11111111-1111-4111-8111-111111111111",
      draftId: "22222222-2222-4222-8222-222222222222",
    });
});
test("approves the whole proposal and disables controls while pending", async ({
  page,
}) => {
  await page.goto("/?calendar-draft=1");
  await page.getByRole("button", { name: "Approve changes" }).click();
  await expect(
    page.getByRole("button", { name: "Approve changes" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Discard draft" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Approve changes" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { calendarReview?: { intent: string } })
          .calendarReview?.intent,
    ),
  ).toBe("approve");
});
for (const locale of ["en", "es", "it"])
  test(`fits the translated review panel on mobile (${locale})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/?calendar-draft=1&locale=${locale}`);
    await expect(page.locator(".calendar-draft-operations > li")).toHaveCount(
      3,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: `/tmp/holpro-calendar-${locale}.png`,
      fullPage: true,
    });
  });

test("lets the coach discard an obsolete draft without allowing approval", async ({
  page,
}) => {
  await page.goto("/?calendar-draft=1&invalid=1");
  await expect(page.getByRole("alert")).toContainText("This draft has changed");
  await expect(
    page.getByRole("button", { name: "Approve changes" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm discard", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { calendarReview?: { intent: string } })
            .calendarReview?.intent,
      ),
    )
    .toBe("discard");
});
