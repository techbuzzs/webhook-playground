import { expect, test } from "@playwright/test";

test("landing page presents the anonymous capture flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /See what your webhook actually received/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Create endpoint", exact: true })).toBeVisible();
  await expect(page.getByText("No account required")).toBeVisible();
  await expect(page.getByText("Demo checkout", { exact: true })).toBeVisible();
});

test("API documentation route is linked", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "API docs" }).click();
  await expect(page).toHaveURL(/\/docs\/api/);
  await expect(page.getByText("OpenAPI 3.1")).toBeVisible();
});
