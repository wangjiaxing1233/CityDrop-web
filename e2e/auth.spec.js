import { test, expect } from "@playwright/test";

// Smoke test: no backend required, just proves the app boots and routing works.
test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: /log ?in/i }),
  ).toBeVisible();
});

// Needs the Spring Boot backend on :8080 with a known account. Fill in the
// selectors and credentials, then remove .fixme.
test.fixme("a registered user can log in and reach the home page", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/username/i).fill("testuser");
  await page.getByLabel(/password/i).fill("password");
  await page.getByRole("button", { name: /log ?in/i }).click();
  await expect(page).toHaveURL("/");
});
