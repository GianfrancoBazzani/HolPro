import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & {
      fixtureSource?: EventTarget;
      fixtureSourceUrl?: string;
      fixtureClosed?: number;
    };
    class Source extends EventTarget {
      constructor(url: string) {
        super();
        state.fixtureSourceUrl = url;
        state.fixtureSource = this;
        setTimeout(() => this.dispatchEvent(new Event("open")), 0);
      }
      close() {
        state.fixtureClosed = (state.fixtureClosed ?? 0) + 1;
      }
    }
    Object.defineProperty(window, "EventSource", { value: Source });
  });
});
test("executes plan scripts in an opaque sandbox while blocking parent access and fetch", async ({
  page,
}) => {
  await page.goto("/?plans=1");
  const frame = page.frameLocator(".plan-frame");
  await expect(
    frame.getByRole("heading", { name: "Coaching plan" }),
  ).toBeVisible();
  const iframe = await page.locator(".plan-frame").elementHandle(),
    content = await iframe!.contentFrame();
  await expect
    .poll(() =>
      content!.evaluate(
        () =>
          (window as typeof window & { fetchBlocked?: boolean }).fetchBlocked,
      ),
    )
    .toBe(true);
  expect(
    await content!.evaluate(() => ({
      ran: (window as typeof window & { ran?: boolean }).ran,
      blocked: (window as typeof window & { parentBlocked?: boolean })
        .parentBlocked,
      mode: document.compatMode,
    })),
  ).toEqual({ ran: true, blocked: true, mode: "CSS1Compat" });
  expect(await page.locator("body").getAttribute("data-escaped")).toBeNull();
  expect(await page.locator(".plan-frame").getAttribute("sandbox")).toBe(
    "allow-scripts",
  );
});
test("ignores forged height messages and clamps own-frame heights", async ({
  page,
}) => {
  await page.goto("/?plans=1");
  const viewer = page.locator(".plan-frame"),
    initial = await viewer.evaluate((e) => e.getAttribute("style"));
  await page.evaluate(() =>
    window.postMessage({ type: "holpro:height", value: 9999 }, "*"),
  );
  await page.waitForTimeout(50);
  expect(await viewer.getAttribute("style")).toBe(initial);
  const frame = await (await viewer.elementHandle())!.contentFrame();
  await frame!.evaluate(() =>
    parent.postMessage({ type: "holpro:height", value: 50_000 }, "*"),
  );
  await expect(viewer).toHaveCSS("height", "20000px");
  await frame!.evaluate(() =>
    parent.postMessage({ type: "holpro:height", value: NaN }, "*"),
  );
  await page.waitForTimeout(50);
  await expect(viewer).toHaveCSS("height", "20000px");
  await frame!.evaluate(() =>
    parent.postMessage({ type: "holpro:height", value: -1 }, "*"),
  );
  await expect(viewer).toHaveCSS("height", "480px");
});
test("refreshes on initial connection, publication and reconnect, coalescing bursts", async ({
  page,
}) => {
  await page.goto("/?plans=1");
  const count = () =>
    page.evaluate(
      () =>
        (window as typeof window & { fixtureRefreshCount?: number })
          .fixtureRefreshCount,
    );
  await expect.poll(count).toBe(1);
  await page.evaluate(() => {
    const source = (window as typeof window & { fixtureSource: EventTarget })
      .fixtureSource;
    source.dispatchEvent(new Event("plan.published"));
    source.dispatchEvent(new Event("plan.published"));
    source.dispatchEvent(new Event("open"));
  });
  await expect.poll(count).toBe(2);
});
test("submits document selection with the existing calendar month", async ({
  page,
}) => {
  await page.goto("/?plans=1");
  await page.getByLabel("Choose a plan").selectOption("p2");
  await Promise.all([
    page.waitForURL("**/pro?month=2026-09&engagement=e1&plan=p2"),
    page.getByRole("button", { name: "View plan" }).click(),
  ]);
});
for (const locale of ["en", "es", "it"])
  test(`document panel fits mobile in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/?plans=1&locale=${locale}`);
    await expect(page.locator(".plan-frame")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

test("plan notifications retain the coach portal", async ({ page }) => {
  await page.goto("/?plans=1");
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { fixtureSourceUrl?: string }).fixtureSourceUrl,
  )).toBe("/api/plans/events?portal=coach");
});
