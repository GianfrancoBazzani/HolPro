import { test, expect } from "@playwright/test";

for (const role of ["coach", "coachee"]) {
  test(`push switch in settings saves on and off for ${role}`, async ({ page }) => {
    let subscribed = false;
    let fail = false;
    const actions: string[] = [];
    await page.addInitScript(() => {
      let subscription: object | null = null;
      const registration = {
        pushManager: {
          getSubscription: async () => subscription,
          subscribe: async () => {
            subscription = {
              endpoint: "https://fcm.googleapis.com/test",
              toJSON: () => ({ endpoint: "https://fcm.googleapis.com/test", keys: {} }),
              unsubscribe: async () => { subscription = null; return true; },
            };
            return subscription;
          },
        },
      };
      Object.defineProperty(window, "PushManager", { configurable: true, value: function () {} });
      Object.defineProperty(window, "Notification", { configurable: true, value: {
        permission: "granted", requestPermission: async () => "granted",
      } });
      Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
        getRegistration: async () => registration,
        register: async () => registration,
        ready: Promise.resolve(registration),
      } });
    });
    await page.route("**/api/onboarding?*", async (route) => {
      if (route.request().method() === "POST") {
        const action = route.request().postDataJSON().action;
        actions.push(action);
        if (fail) return route.fulfill({ status: 500 });
        subscribed = action === "subscribe";
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ json: { requests: [], notifications: [], pushPublicKey: "dGVzdA", pushSubscribed: subscribed } });
    });
    await page.goto(`/?onboarding&role=${role}`);
    await expect(page.getByText("No coaching updates yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: /push notifications/i })).toHaveCount(0);
    await page.goto(`/?telegram&locale=en&role=${role}`);
    await page.locator('[aria-haspopup="dialog"]').click();
    const toggle = page.getByRole("switch", { name: "Push notifications" });
    await expect(toggle).toBeEnabled();
    await expect(toggle).not.toBeChecked();
    expect(actions).toEqual([]);
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toBeChecked();
    await page.keyboard.press("Escape");
    await page.locator('[aria-haspopup="dialog"]').click();
    await expect(toggle).toBeChecked();
    fail = true;
    await toggle.click();
    await expect(page.getByRole("alert")).toContainText("Could not update push notifications");
    await expect(toggle).toBeChecked();
    fail = false;
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    expect(actions).toEqual(["subscribe", "unsubscribe", "unsubscribe"]);
    await page.setViewportSize({ width: 360, height: 900 });
    expect(await page.locator("dialog").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/holpro-push-settings-${role}.png`, fullPage: true });
  });
}
