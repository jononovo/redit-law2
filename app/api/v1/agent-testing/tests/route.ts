import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { storage } from "@/server/storage";
import { AGENT_TEST_ID_PREFIX, DEFAULT_TOTAL_FIELDS } from "@/features/agent-testing/constants";
import { generateTestCardData } from "@/features/agent-testing/test-card-generator";
import { RAIL5_TEST_CHECKOUT_PAGE_ID } from "@/features/payment-rails/rail5";
import type { CreateTestInput, ExpectedValues } from "@/features/agent-testing/types";

function generateTestId(): string {
  return AGENT_TEST_ID_PREFIX + randomBytes(6).toString("hex");
}

function buildInstructions(testUrl: string, expected: ExpectedValues): string {
  const formatted = expected.cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ");
  return [
    `Navigate to ${testUrl} and fill out the checkout form with these details:`,
    `- Cardholder Name: ${expected.cardholderName}`,
    `- Card Number: ${formatted}`,
    `- Expiry: ${expected.cardExpiry}`,
    `- CVV: ${expected.cardCvv}`,
    `- ZIP: ${expected.billingZip}`,
    ``,
    `Click 'Submit Test Payment' when all fields are filled.`,
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateTestInput = await request.json().catch(() => ({}));

    const testId = generateTestId();

    let expected: ExpectedValues;
    if (body.expected_values && body.expected_values.cardholderName && body.expected_values.cardNumber) {
      expected = {
        cardholderName: body.expected_values.cardholderName,
        cardNumber: body.expected_values.cardNumber,
        cardExpiry: body.expected_values.cardExpiry ?? generateTestCardData().cardExpiry,
        cardCvv: body.expected_values.cardCvv ?? generateTestCardData().cardCvv,
        billingZip: body.expected_values.billingZip ?? generateTestCardData().billingZip,
      };
    } else {
      expected = generateTestCardData();
    }

    const baseUrl = request.headers.get("x-forwarded-host") || request.headers.get("host") || "creditclaw.com";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const testUrl = `${proto}://${baseUrl}/test-checkout?t=${testId}`;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await storage.createAgentTest({
      testId,
      checkoutPageId: RAIL5_TEST_CHECKOUT_PAGE_ID,
      checkoutType: body.checkout_type ?? "basic",
      expectedValues: expected,
      ownerUid: body.owner_uid ?? null,
      cardId: body.card_id ?? null,
      cardTestToken: body.card_test_token ?? null,
      botId: body.bot_id ?? null,
      approvalRequired: body.approval_required ?? false,
      totalFields: DEFAULT_TOTAL_FIELDS,
      expiresAt,
    });

    return NextResponse.json({
      test_id: testId,
      test_url: testUrl,
      expected_values: expected,
      instructions: buildInstructions(testUrl, expected),
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[agent-testing] create test error:", err);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}
