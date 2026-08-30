import { test, expect } from "@playwright/test";

// AI Customer Support (Feature 4). Needs the backend on :8080 with the /chat
// endpoint wired up and a logged-in session. Fill in selectors, then remove
// .fixme.
test.fixme("send a message and get a reply", async ({ page }) => {
  await page.goto("/support");

  await page.getByRole("textbox").fill("Where is my order #1001?");
  await page.getByRole("button", { name: /send/i }).click();

  // The user's message shows immediately; the assistant's reply follows.
  await expect(page.getByText("Where is my order #1001?")).toBeVisible();
  await expect(page.getByTestId("assistant-message").last()).toBeVisible();
});
