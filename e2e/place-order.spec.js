import { test, expect } from "@playwright/test";

// End-to-end order flow. Needs the Spring Boot backend on :8080 and a
// logged-in session (share auth state via a Playwright setup project, or
// log in at the top of the test). Fill in selectors, then remove .fixme.
test.fixme("place an order, then confirm drop-off", async ({ page }) => {
  await page.goto("/order");

  await page
    .getByLabel(/destination/i)
    .fill("1000 The Embarcadero, San Francisco, CA 94133");
  await page.getByLabel(/weight/i).fill("2");
  await page.getByRole("button", { name: /get delivery options/i }).click();

  await page.getByRole("button", { name: /select/i }).first().click();
  await page.getByRole("button", { name: /place order/i }).click();

  await expect(page.getByText(/pending drop-off/i)).toBeVisible();

  await page.getByRole("button", { name: /confirm drop-?off/i }).click();
  await expect(page.getByText(/on the way/i)).toBeVisible();
});
