import {
  createTestBot,
  createTestCard,
  linkBotToCard,
  getWalletBalance,
  getConfirmation,
  generateConfirmationUrl,
  cleanupTestData,
  closePool,
} from "./helpers";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const TARGET_EMAIL = process.argv[2] || "jon@5ducks.ai";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("=".repeat(60));
  console.log("CreditClaw E2E Test: Rail 4 Checkout Flow");
  console.log("=".repeat(60));
  console.log(`Target email: ${TARGET_EMAIL}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  await cleanupTestData();

  console.log("\n--- Step 1: Create Test Bot ---");
  const bot = await createTestBot({
    botName: "E2E Test Agent",
    ownerEmail: TARGET_EMAIL,
    ownerUid: "test_uid_e2e_owner",
  });

  console.log("\n--- Step 2: Create Test Card ---");
  const card = await createTestCard({
    ownerUid: bot.ownerUid,
    cardName: "E2E Test Card",
    realProfileIndex: 3,
  });

  console.log("\n--- Step 3: Link Card to Bot ---");
  await linkBotToCard(card.cardId, bot.botId);

  const balanceBefore = await getWalletBalance(bot.botId);
  console.log(`\n  Wallet balance before checkout: $${(balanceBefore / 100).toFixed(2)}`);

  console.log("\n--- Step 4: Send Checkout Request (Real Profile, Requires Approval) ---");
  const checkoutBody = {
    profile_index: card.realProfileIndex,
    merchant_name: "Amazon Web Services",
    merchant_url: "https://aws.amazon.com",
    item_name: "EC2 Instance - m5.xlarge (1 month)",
    amount_cents: 15000,
    category: "cloud_computing",
    card_id: card.cardId,
  };

  console.log(`  POST ${BASE_URL}/api/v1/bot/merchant/checkout`);
  console.log(`  Body: ${JSON.stringify(checkoutBody, null, 2)}`);

  const checkoutRes = await fetch(`${BASE_URL}/api/v1/bot/merchant/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${bot.apiKey}`,
    },
    body: JSON.stringify(checkoutBody),
  });

  const checkoutData = await checkoutRes.json();
  console.log(`\n  Response (${checkoutRes.status}):`);
  console.log(`  ${JSON.stringify(checkoutData, null, 2)}`);

  if (checkoutRes.status !== 202 || checkoutData.status !== "pending_confirmation") {
    console.error("\n  UNEXPECTED: Expected 202 pending_confirmation.");
    console.error("  The checkout may have auto-approved (exempt) or failed.");
    await closePool();
    process.exit(1);
  }

  const confirmationId = checkoutData.confirmation_id;
  console.log(`\n  Confirmation ID: ${confirmationId}`);

  const confirmUrl = generateConfirmationUrl(confirmationId);
  console.log(`\n--- Step 5: Confirmation Link ---`);
  console.log(`  Email should have been sent to: ${TARGET_EMAIL}`);
  console.log(`  Direct approval link:`);
  console.log(`  ${confirmUrl}`);

  const conf = await getConfirmation(confirmationId);
  console.log(`\n  DB confirmation status: ${conf?.status}`);
  console.log(`  Expires at: ${conf?.expires_at}`);

  console.log(`\n--- Step 6: Polling for Approval ---`);
  console.log(`  The bot would poll: GET ${BASE_URL}/api/v1/bot/merchant/checkout/status?confirmation_id=${confirmationId}`);
  console.log(`  Waiting for you to click the approval link above...\n`);

  const maxPollTime = 5 * 60 * 1000;
  const pollInterval = 5000;
  const startTime = Date.now();
  let finalStatus = "pending";

  while (Date.now() - startTime < maxPollTime) {
    const statusRes = await fetch(
      `${BASE_URL}/api/v1/bot/merchant/checkout/status?confirmation_id=${confirmationId}`,
      {
        headers: { "Authorization": `Bearer ${bot.apiKey}` },
      }
    );
    const statusData = await statusRes.json();
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (statusData.status !== "pending") {
      finalStatus = statusData.status;
      console.log(`  [${elapsed}s] Status changed: ${statusData.status}`);
      console.log(`  Full response: ${JSON.stringify(statusData, null, 2)}`);
      break;
    }

    process.stdout.write(`  [${elapsed}s] Still pending... (polling every 5s)\r`);
    await sleep(pollInterval);
  }

  console.log(`\n\n--- Step 7: Results ---`);
  console.log(`  Final status: ${finalStatus}`);

  const balanceAfter = await getWalletBalance(bot.botId);
  console.log(`  Wallet balance after: $${(balanceAfter / 100).toFixed(2)}`);

  if (finalStatus === "approved") {
    console.log(`  Deducted: $${((balanceBefore - balanceAfter) / 100).toFixed(2)}`);
    console.log(`\n  SUCCESS: The full flow worked end-to-end!`);
    console.log(`  1. Bot sent checkout request`);
    console.log(`  2. Email sent to ${TARGET_EMAIL}`);
    console.log(`  3. Confirmation link was clicked and approved`);
    console.log(`  4. Bot received approval via polling`);
    console.log(`  5. Wallet was debited`);
  } else if (finalStatus === "denied") {
    console.log(`\n  The purchase was DENIED by the owner.`);
    console.log(`  Wallet was NOT debited.`);
  } else if (finalStatus === "pending") {
    console.log(`\n  TIMEOUT: No approval received within 5 minutes.`);
    console.log(`  The confirmation link was not clicked.`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Test data preserved. Run 'npx tsx tests/manage.ts cleanup' to remove.");
  console.log("=".repeat(60));

  await closePool();
}

main().catch(async (err) => {
  console.error("Test failed:", err);
  await closePool();
  process.exit(1);
});
