import { expect, test, type Page } from "@playwright/test";

/** Read window.dataLayer as plain arrays (gtag pushes array-like `arguments` objects). */
async function dataLayerEvents(page: Page): Promise<unknown[][]> {
  return page.evaluate(() => {
    const layer =
      (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? [];
    return layer.map((entry) => Array.from(entry as ArrayLike<unknown>));
  });
}

function hasConsent(
  events: unknown[][],
  mode: "default" | "update",
  storage: "granted" | "denied",
): boolean {
  return events.some(
    (event) =>
      event[0] === "consent" &&
      event[1] === mode &&
      (event[2] as { analytics_storage?: string })?.analytics_storage ===
        storage,
  );
}

/**
 * Open the landing and report whether the consent banner appeared. The banner + gtag only load
 * when NEXT_PUBLIC_GA_ID is configured, so tests skip cleanly in an environment without it.
 */
async function openLandingWithBanner(page: Page): Promise<boolean> {
  await page.goto("/");
  return page
    .getByRole("button", { name: "Accept" })
    .waitFor({ state: "visible", timeout: 4000 })
    .then(() => true)
    .catch(() => false);
}

test("consent defaults to denied; Accept grants analytics and is remembered", async ({
  page,
}) => {
  test.skip(
    !(await openLandingWithBanner(page)),
    "GA not configured (NEXT_PUBLIC_GA_ID unset)",
  );

  const accept = page.getByRole("button", { name: "Accept" });
  await expect(page.getByRole("button", { name: "Decline" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Privacy Policy" }),
  ).toBeVisible();

  // Consent Mode default is denied before any choice (nothing tracked yet).
  expect(hasConsent(await dataLayerEvents(page), "default", "denied")).toBe(
    true,
  );

  await accept.click();
  await expect(accept).toBeHidden();

  // The choice is persisted and gtag consent is lifted to granted.
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "s2br_consent")?.value).toBe("granted");
  expect(hasConsent(await dataLayerEvents(page), "update", "granted")).toBe(
    true,
  );

  // Remembered — the bar does not reappear on reload.
  await page.reload();
  await expect(page.getByRole("button", { name: "Accept" })).toHaveCount(0);
});

test("Decline keeps analytics denied and is remembered", async ({ page }) => {
  test.skip(
    !(await openLandingWithBanner(page)),
    "GA not configured (NEXT_PUBLIC_GA_ID unset)",
  );

  await page.getByRole("button", { name: "Decline" }).click();

  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "s2br_consent")?.value).toBe("denied");
  expect(hasConsent(await dataLayerEvents(page), "update", "granted")).toBe(
    false,
  );

  await page.reload();
  await expect(page.getByRole("button", { name: "Accept" })).toHaveCount(0);
});
