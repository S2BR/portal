import { expect, test } from "@playwright/test";

test("navigates from sign-in to register", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Create one" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
});

test("verify-email without an email redirects to register", async ({
  page,
}) => {
  await page.goto("/verify-email");
  await expect(page).toHaveURL(/\/register$/);
});
