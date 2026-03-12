import pg from "pg";
import bcrypt from "bcryptjs";
import { randomBytes, createHmac } from "crypto";

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

export function generateTestCardId(): string {
  return "test_card_" + randomBytes(6).toString("hex");
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

export interface TestCard {
  cardId: string;
  cardName: string;
  realProfileIndex: number;
  missingDigitPositions: number[];
  missingDigitsValue: string;
  decoyFilename: string;
  fakeProfilesJson: string;
  profilePermissions: string;
}

export async function createTestCard(opts: {
  ownerUid: string;
  cardName?: string;
  realProfileIndex?: number;
  botId?: string;
  status?: string;
}): Promise<TestCard> {
  const p = getPool();
  const cardId = generateTestCardId();
  const cardName = opts.cardName || "Test Card";
  const realProfileIndex = opts.realProfileIndex || 3;
  const missingDigitPositions = [4, 8, 12];
  const missingDigitsValue = "789";
  const decoyFilename = "test_decoy_file";
  const status = opts.status || "awaiting_bot";

  const fakeProfiles = [1, 2, 4, 5, 6]
    .filter(i => i !== realProfileIndex)
    .map(i => ({
      profileIndex: i,
      fakeMissingDigits: String(100 + i),
      fakeExpiryMonth: (i % 12) + 1,
      fakeExpiryYear: 2027,
      fakeName: `Fake Name ${i}`,
      fakeZip: `1000${i}`,
    }));
  const fakeProfilesJson = JSON.stringify(fakeProfiles);

  const profilePermissions = JSON.stringify([
    {
      profile_index: realProfileIndex,
      allowance_duration: "day",
      allowance_currency: "USD",
      allowance_value: 500,
      confirmation_exempt_limit: 10,
      human_permission_required: "above_exempt",
      creditclaw_permission_required: "all",
    },
    ...fakeProfiles.slice(0, 2).map(f => ({
      profile_index: f.profileIndex,
      allowance_duration: "day",
      allowance_currency: "USD",
      allowance_value: 100,
      confirmation_exempt_limit: 5,
      human_permission_required: "none",
      creditclaw_permission_required: "all",
    })),
  ]);

  await p.query(
    `INSERT INTO rail4_cards (card_id, owner_uid, card_name, use_case, bot_id, decoy_filename, real_profile_index, missing_digit_positions, missing_digits_value, expiry_month, expiry_year, owner_name, owner_zip, status, fake_profiles_json, profile_permissions, created_at, updated_at)
     VALUES ($1, $2, $3, 'Testing', $4, $5, $6, $7, $8, 12, 2027, 'Test Owner', '90210', $9, $10, $11, NOW(), NOW())`,
    [cardId, opts.ownerUid, cardName, opts.botId || null, decoyFilename, realProfileIndex, missingDigitPositions, missingDigitsValue, status, fakeProfilesJson, profilePermissions]
  );

  console.log(`  Card created: ${cardId} (${cardName})`);
  console.log(`  Status: ${status}`);
  console.log(`  Real profile index: ${realProfileIndex}`);
  if (opts.botId) console.log(`  Linked to bot: ${opts.botId}`);

  return { cardId, cardName, realProfileIndex, missingDigitPositions, missingDigitsValue, decoyFilename, fakeProfilesJson, profilePermissions };
}

export async function linkBotToCard(cardId: string, botId: string) {
  const p = getPool();
  await p.query(
    `UPDATE rail4_cards SET bot_id = $1, status = 'active', updated_at = NOW() WHERE card_id = $2`,
    [botId, cardId]
  );
  console.log(`  Card ${cardId} linked to bot ${botId} (status: active)`);
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

export async function getConfirmation(confirmationId: string) {
  const p = getPool();
  const res = await p.query(
    `SELECT * FROM checkout_confirmations WHERE confirmation_id = $1`,
    [confirmationId]
  );
  return res.rows[0] || null;
}

export async function listPendingConfirmations(botId?: string) {
  const p = getPool();
  const query = botId
    ? `SELECT * FROM checkout_confirmations WHERE bot_id = $1 AND status = 'pending' ORDER BY created_at DESC`
    : `SELECT * FROM checkout_confirmations WHERE status = 'pending' ORDER BY created_at DESC`;
  const params = botId ? [botId] : [];
  const res = await p.query(query, params);
  return res.rows;
}

export function generateConfirmationUrl(confirmationId: string): string {
  const hmacSecret = process.env.CONFIRMATION_HMAC_SECRET || process.env.CRON_SECRET;
  if (!hmacSecret) throw new Error("No HMAC secret configured (set CONFIRMATION_HMAC_SECRET or CRON_SECRET)");
  const hmacToken = createHmac("sha256", hmacSecret).update(confirmationId).digest("hex");
  const baseUrl = process.env.TEST_BASE_URL || "http://localhost:5000";
  return `${baseUrl}/api/v1/rail4/confirm/${confirmationId}?token=${hmacToken}`;
}

export async function cleanupTestData() {
  const p = getPool();
  console.log("\nCleaning up test data...");
  await p.query(`DELETE FROM checkout_confirmations WHERE bot_id LIKE 'test_bot_%'`);
  await p.query(`DELETE FROM profile_allowance_usage WHERE card_id LIKE 'test_card_%'`);
  await p.query(`DELETE FROM obfuscation_events WHERE card_id LIKE 'test_card_%'`);
  await p.query(`DELETE FROM obfuscation_state WHERE card_id LIKE 'test_card_%'`);
  await p.query(`DELETE FROM transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE bot_id LIKE 'test_bot_%')`);
  await p.query(`DELETE FROM rail4_cards WHERE card_id LIKE 'test_card_%'`);
  await p.query(`DELETE FROM wallets WHERE bot_id LIKE 'test_bot_%'`);
  await p.query(`DELETE FROM api_access_logs WHERE bot_id LIKE 'test_bot_%'`);
  await p.query(`DELETE FROM notifications WHERE bot_id LIKE 'test_bot_%'`);
  await p.query(`DELETE FROM bots WHERE bot_id LIKE 'test_bot_%'`);
  console.log("  Test data cleaned up.");
}

export async function listTestBots() {
  const p = getPool();
  const res = await p.query(
    `SELECT b.bot_id, b.bot_name, b.owner_email, b.wallet_status, w.balance_cents,
            (SELECT count(*) FROM rail4_cards WHERE bot_id = b.bot_id AND status = 'active') as active_cards
     FROM bots b LEFT JOIN wallets w ON b.bot_id = w.bot_id
     WHERE b.bot_id LIKE 'test_bot_%'
     ORDER BY b.created_at DESC`
  );
  return res.rows;
}

export async function listTestCards() {
  const p = getPool();
  const res = await p.query(
    `SELECT card_id, card_name, owner_uid, bot_id, status, real_profile_index, created_at
     FROM rail4_cards WHERE card_id LIKE 'test_card_%'
     ORDER BY created_at DESC`
  );
  return res.rows;
}
