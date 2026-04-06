import pg from "pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

let pool: pg.Pool;

export function getPool() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}

export async function closePool() {
  if (pool) await pool.end();
}

export function generateTestBotId(): string {
  return "test_bot_" + randomBytes(4).toString("hex");
}

export function generateTestApiKey(): string {
  return "cck_live_" + randomBytes(24).toString("hex");
}


export interface TestBot {
  botId: string;
  botName: string;
  apiKey: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  ownerEmail: string;
  ownerUid: string;
  webhookSecret: string;
}

export async function createTestBot(opts: {
  botName?: string;
  ownerEmail?: string;
  ownerUid?: string;
}): Promise<TestBot> {
  const p = getPool();
  const botId = generateTestBotId();
  const apiKey = generateTestApiKey();
  const apiKeyHash = await bcrypt.hash(apiKey, 10);
  const apiKeyPrefix = apiKey.substring(0, 12);
  const webhookSecret = "whsec_test_" + randomBytes(12).toString("hex");
  const ownerUid = opts.ownerUid || "test_uid_" + randomBytes(4).toString("hex");
  const ownerEmail = opts.ownerEmail || "test@example.com";
  const botName = opts.botName || "Test Bot";

  await p.query(
    `INSERT INTO bots (bot_id, bot_name, description, owner_email, owner_uid, api_key_hash, api_key_prefix, claim_token, wallet_status, callback_url, webhook_secret, claimed_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, 'active', NULL, $8, NOW(), NOW())`,
    [botId, botName, `Test bot: ${botName}`, ownerEmail, ownerUid, apiKeyHash, apiKeyPrefix, webhookSecret]
  );

  await p.query(
    `INSERT INTO wallets (bot_id, owner_uid, balance_cents, currency, is_frozen, created_at, updated_at)
     VALUES ($1, $2, 100000, 'usd', false, NOW(), NOW())`,
    [botId, ownerUid]
  );

  console.log(`  Bot created: ${botId} (${botName})`);
  console.log(`  API key: ${apiKey}`);
  console.log(`  Owner: ${ownerEmail} (uid: ${ownerUid})`);
  console.log(`  Wallet: $1000.00`);

  return { botId, botName, apiKey, apiKeyHash, apiKeyPrefix, ownerEmail, ownerUid, webhookSecret };
}

export async function fundWallet(botId: string, amountCents: number) {
  const p = getPool();
  await p.query(
    `UPDATE wallets SET balance_cents = balance_cents + $1, updated_at = NOW() WHERE bot_id = $2`,
    [amountCents, botId]
  );
  console.log(`  Wallet funded: +$${(amountCents / 100).toFixed(2)} for bot ${botId}`);
}

export async function getWalletBalance(botId: string): Promise<number> {
  const p = getPool();
  const res = await p.query(`SELECT balance_cents FROM wallets WHERE bot_id = $1`, [botId]);
  return res.rows[0]?.balance_cents || 0;
}

export async function cleanupTestData() {
  const p = getPool();
  console.log("\nCleaning up test data...");
  await p.query(`DELETE FROM transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE bot_id LIKE 'test_bot_%')`);
  await p.query(`DELETE FROM wallets WHERE bot_id LIKE 'test_bot_%'`);
  await p.query(`DELETE FROM api_access_logs WHERE bot_id LIKE 'test_bot_%'`);
  await p.query(`DELETE FROM notifications WHERE bot_id LIKE 'test_bot_%'`);
  await p.query(`DELETE FROM bots WHERE bot_id LIKE 'test_bot_%'`);
  console.log("  Test data cleaned up.");
}

export async function listTestBots() {
  const p = getPool();
  const res = await p.query(
    `SELECT b.bot_id, b.bot_name, b.owner_email, b.wallet_status, w.balance_cents
     FROM bots b LEFT JOIN wallets w ON b.bot_id = w.bot_id
     WHERE b.bot_id LIKE 'test_bot_%'
     ORDER BY b.created_at DESC`
  );
  return res.rows;
}
