import { test, expect } from "@playwright/test";

const CHECKOUT_PAGE_ID = process.env.TEST_CHECKOUT_PAGE_ID;

test.describe("Checkout Flow — Test Payment", () => {
  test.skip(!CHECKOUT_PAGE_ID, "TEST_CHECKOUT_PAGE_ID not set");

  test("completes a test payment via the checkout page", async ({ page }) => {
    await page.goto(`/pay/${CHECKOUT_PAGE_ID}`);

    // Select testing payment method
    await page.locator('[data-testid="payment-method-testing"]').click();

    // Fill test card form
    await page.locator('[data-testid="input-test-cardholder-name"]').fill("Agent Test");
    await page.locator('[data-testid="input-test-card-number"]').fill("4242424242424242");
    await page.locator('[data-testid="select-test-expiry-month"]').selectOption("12");
    await page.locator('[data-testid="select-test-expiry-year"]').selectOption("2028");
    await page.locator('[data-testid="input-test-card-cvv"]').fill("123");
    await page.locator('[data-testid="input-test-billing-zip"]').fill("10001");

    // Submit payment
    await page.locator('[data-testid="button-test-pay"]').click();

    // Wait for success
    await expect(page.locator('[data-testid="testing-handler-success"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});
