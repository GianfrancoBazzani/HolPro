import { test, expect } from "@playwright/test";
import en from "../../messages/en.json";
import it from "../../messages/it.json";
import es from "../../messages/es.json";
for (const [locale, messages] of Object.entries({ en, it, es })) {
  test(`onboarding status and review link fit mobile and desktop in ${locale}`, async ({
    page,
  }) => {
    await page.route("**/api/onboarding?*", (route) =>
      route.fulfill({
        json: {
          requests: [
            {
              id: "r",
              coachId: "c",
              coachName: "Lorenzo Candela Chad",
              clientName: "Gianfranco Bazzani",
              engagementId: "e",
              status: "awaiting_review",
            },
          ],
          notifications: [
            {
              id: "n",
              kind: "draft_ready",
              href: "/pro?engagement=e&plan=p&preview=draft",
              readAt: null,
            },
          ],
          pushPublicKey: "test-key",
        },
      }),
    );
    await page.goto(`/?onboarding&role=coach&locale=${locale}`);
    await expect(
      page.getByText(
        messages.dashboard["onboarding.coach.awaiting_review"].replace(
          "{clientName}",
          "Gianfranco Bazzani",
        ),
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: messages.dashboard["notification.draft_ready.title"],
      }),
    ).toHaveAttribute("href", "/pro?engagement=e&plan=p&preview=draft");
    for (const width of [360, 1360]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    if (locale === "it")
      await page.screenshot({
        path: "/tmp/holpro-onboarding-desktop.png",
        fullPage: true,
      });
  });
}
test("failed preparation can be retried without a new request", async ({
  page,
}) => {
  let status = "failed";
  const mutations: unknown[] = [];
  await page.route("**/api/onboarding?*", (route) => {
    if (route.request().method() === "POST") {
      mutations.push(route.request().postDataJSON());
      status = "requested";
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({
      json: {
        requests: [
          {
            id: "r",
            coachId: "c",
            coachName: "Lorenzo",
            engagementId: "e",
            status,
          },
        ],
        notifications: [],
        pushPublicKey: null,
      },
    });
  });
  await page.goto("/?onboarding");
  await page.getByRole("button", { name: "Retry preparation" }).click();
  await expect(
    page.getByText("Your request to Lorenzo is queued."),
  ).toBeVisible();
  expect(mutations).toEqual([{ action: "retry", id: "r" }]);
});

test("a new account does not silently inherit browser push consent", async ({
  page,
}) => {
  const mutations: unknown[] = [];
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistration: async () => ({
          pushManager: {
            getSubscription: async () => ({
              toJSON: () => ({
                endpoint: "https://fcm.googleapis.com/old-account",
              }),
            }),
          },
        }),
      },
    });
  });
  await page.route("**/api/onboarding?*", (route) => {
    if (route.request().method() === "POST")
      mutations.push(route.request().postDataJSON());
    return route.fulfill({
      json: {
        requests: [],
        notifications: [],
        pushPublicKey: "key",
        pushSubscribed: false,
      },
    });
  });
  await page.goto("/?telegram&locale=en");
  await page.locator('[aria-haspopup="dialog"]').click();
  await expect(
    page.getByRole("switch", { name: "Push notifications" }),
  ).not.toBeChecked();
  expect(mutations).toEqual([]);
});
