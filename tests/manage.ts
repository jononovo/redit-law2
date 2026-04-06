import {
  cleanupTestData,
  listTestBots,
  getWalletBalance,
  fundWallet,
  closePool,
  getPool,
} from "./helpers";

const commands: Record<string, () => Promise<void>> = {
  async list() {
    console.log("=".repeat(60));
    console.log("CreditClaw Test Data");
    console.log("=".repeat(60));

    console.log("\n--- Test Bots ---");
    const bots = await listTestBots();
    if (bots.length === 0) {
      console.log("  No test bots found.");
    } else {
      for (const b of bots) {
        console.log(`  ${b.bot_id} | ${b.bot_name} | ${b.owner_email} | status: ${b.wallet_status} | balance: $${(b.balance_cents / 100).toFixed(2)} | active cards: ${b.active_cards}`);
      }
    }
  },

  async cleanup() {
    await cleanupTestData();
  },

  async balance() {
    const botId = process.argv[3];
    if (!botId) {
      const bots = await listTestBots();
      for (const b of bots) {
        console.log(`  ${b.bot_id}: $${(b.balance_cents / 100).toFixed(2)}`);
      }
      return;
    }
    const balance = await getWalletBalance(botId);
    console.log(`  ${botId}: $${(balance / 100).toFixed(2)}`);
  },

  async fund() {
    const botId = process.argv[3];
    const amountUsd = parseFloat(process.argv[4] || "0");
    if (!botId || amountUsd <= 0) {
      console.error("Usage: npx tsx tests/manage.ts fund <bot_id> <amount_usd>");
      return;
    }
    await fundWallet(botId, Math.round(amountUsd * 100));
    const balance = await getWalletBalance(botId);
    console.log(`  New balance: $${(balance / 100).toFixed(2)}`);
  },

  async logs() {
    const p = getPool();
    const botId = process.argv[3];
    const query = botId
      ? `SELECT * FROM api_access_logs WHERE bot_id = $1 ORDER BY created_at DESC LIMIT 20`
      : `SELECT * FROM api_access_logs WHERE bot_id LIKE 'test_bot_%' ORDER BY created_at DESC LIMIT 20`;
    const params = botId ? [botId] : [];
    const res = await p.query(query, params);
    if (res.rows.length === 0) {
      console.log("No API logs found.");
      return;
    }
    for (const log of res.rows) {
      console.log(`  [${log.created_at}] ${log.method} ${log.endpoint} → ${log.status_code} (${log.response_time_ms}ms) ${log.error_code || ""}`);
    }
  },

  async transactions() {
    const p = getPool();
    const res = await p.query(
      `SELECT t.*, w.bot_id FROM transactions t
       JOIN wallets w ON t.wallet_id = w.id
       WHERE w.bot_id LIKE 'test_bot_%'
       ORDER BY t.created_at DESC LIMIT 20`
    );
    if (res.rows.length === 0) {
      console.log("No test transactions found.");
      return;
    }
    for (const tx of res.rows) {
      console.log(`  [${tx.created_at}] ${tx.type} | $${(tx.amount_cents / 100).toFixed(2)} | ${tx.description} | bot: ${tx.bot_id}`);
    }
  },

  async help() {
    console.log("CreditClaw Test Manager");
    console.log("");
    console.log("Commands:");
    console.log("  list              List all test bots");
    console.log("  cleanup           Remove all test data (test_bot_*)");
    console.log("  balance [bot_id]  Show wallet balance(s)");
    console.log("  fund <bot_id> <$> Add funds to a test bot wallet");
    console.log("  logs [bot_id]     Show recent API access logs");
    console.log("  transactions      Show recent test transactions");
    console.log("  help              Show this help message");
  },
};

async function main() {
  const cmd = process.argv[2] || "help";
  const handler = commands[cmd];
  if (!handler) {
    console.error(`Unknown command: ${cmd}`);
    console.error('Run "npx tsx tests/manage.ts help" for available commands.');
    await closePool();
    process.exit(1);
  }
  await handler();
  await closePool();
}

main().catch(async (err) => {
  console.error("Error:", err);
  await closePool();
  process.exit(1);
});
