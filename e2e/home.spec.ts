import { expect, test } from "@playwright/test";

test("boot page renders the S2BR brand and logo", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "S2BR Portal" }),
  ).toBeVisible();
  await expect(page.getByAltText("S2BR")).toBeVisible();
});
