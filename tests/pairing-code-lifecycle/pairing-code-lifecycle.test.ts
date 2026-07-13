import { describe, it, expect, afterAll } from "vitest";
import { randomBytes } from "crypto";
import { getPool, closePool } from "../helpers";
import { pairingWaitlistMethods } from "@/server/storage/payment-rails/payment-links";

const TEST_UID_PREFIX = "test_pairing_uid_";
const TEST_BOT_PREFIX = "test_pairing_bot_";

function testUid(): string {
  return TEST_UID_PREFIX + randomBytes(4).toString("hex");
}

function testBotId(): string {
  return TEST_BOT_PREFIX + randomBytes(4).toString("hex");
}

function testCode(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

const createdCodes: string[] = [];
const createdBotIds: string[] = [];

async function insertPairingCode(opts: {
  code: string;
  status?: string;
  ownerUid?: string | null;
  botId?: string | null;
  expiresAt?: Date;
}) {
  const p = getPool();
  const expiresAt = opts.expiresAt || new Date(Date.now() + 15 * 60 * 1000);
  await p.query(
    `INSERT INTO pairing_codes (code, status, owner_uid, bot_id, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [opts.code, opts.status || "pending", opts.ownerUid || null, opts.botId || null, expiresAt]
  );
  createdCodes.push(opts.code);
}

async function insertPendingBot(botId: string) {
  const p = getPool();
  await p.query(
    `INSERT INTO bots (bot_id, bot_name, description, owner_email, owner_uid, api_key_hash, api_key_prefix, claim_token, wallet_status, created_at)
     VALUES ($1, 'Pairing Test Bot', 'pairing lifecycle test', 'pairing-test@example.com', NULL, 'test_hash', 'cck_live_test', NULL, 'pending', NOW())`,
    [botId]
  );
  createdBotIds.push(botId);
}

async function getCodeRow(code: string) {
  const p = getPool();
  const res = await p.query(`SELECT * FROM pairing_codes WHERE code = $1`, [code]);
  return res.rows[0];
}

async function getBotRow(botId: string) {
  const p = getPool();
  const res = await p.query(`SELECT * FROM bots WHERE bot_id = $1`, [botId]);
  return res.rows[0];
}

afterAll(async () => {
  const p = getPool();
  if (createdCodes.length) {
    await p.query(`DELETE FROM pairing_codes WHERE code = ANY($1)`, [createdCodes]);
  }
  if (createdBotIds.length) {
    await p.query(`DELETE FROM bots WHERE bot_id = ANY($1)`, [createdBotIds]);
  }
  await closePool();
});

describe("adoptPairingCode (human-first path)", () => {
  it("adopts a pending, unowned, unexpired code — sets ownerUid, status stays pending", async () => {
    const code = testCode();
    const uid = testUid();
    await insertPairingCode({ code });

    const adopted = await pairingWaitlistMethods.adoptPairingCode(code, uid);
    expect(adopted).not.toBeNull();
    expect(adopted!.ownerUid).toBe(uid);
    expect(adopted!.status).toBe("pending");

    const row = await getCodeRow(code);
    expect(row.owner_uid).toBe(uid);
    expect(row.status).toBe("pending");
  });

  it("returns null for an expired code", async () => {
    const code = testCode();
    await insertPairingCode({ code, expiresAt: new Date(Date.now() - 60 * 1000) });

    const adopted = await pairingWaitlistMethods.adoptPairingCode(code, testUid());
    expect(adopted).toBeNull();
  });

  it("returns null when the code is already owned by another user", async () => {
    const code = testCode();
    await insertPairingCode({ code, ownerUid: testUid() });

    const adopted = await pairingWaitlistMethods.adoptPairingCode(code, testUid());
    expect(adopted).toBeNull();
  });

  it("returns null when the code is not pending (registered)", async () => {
    const code = testCode();
    await insertPairingCode({ code, status: "registered", botId: testBotId() });

    const adopted = await pairingWaitlistMethods.adoptPairingCode(code, testUid());
    expect(adopted).toBeNull();
  });

  it("returns null when the code is already claimed", async () => {
    const code = testCode();
    await insertPairingCode({ code, status: "claimed", ownerUid: testUid(), botId: testBotId() });

    const adopted = await pairingWaitlistMethods.adoptPairingCode(code, testUid());
    expect(adopted).toBeNull();
  });
});

describe("claimRegisteredPairingCode (agent-first path)", () => {
  it("claims a registered code — code becomes claimed, bot activated with owner", async () => {
    const code = testCode();
    const botId = testBotId();
    const uid = testUid();
    await insertPendingBot(botId);
    await insertPairingCode({ code, status: "registered", botId });

    const bot = await pairingWaitlistMethods.claimRegisteredPairingCode(code, uid);
    expect(bot).not.toBeNull();
    expect(bot!.botId).toBe(botId);
    expect(bot!.ownerUid).toBe(uid);
    expect(bot!.walletStatus).toBe("active");
    expect(bot!.claimedAt).not.toBeNull();

    const codeRow = await getCodeRow(code);
    expect(codeRow.status).toBe("claimed");
    expect(codeRow.owner_uid).toBe(uid);
    expect(codeRow.claimed_at).not.toBeNull();

    const botRow = await getBotRow(botId);
    expect(botRow.wallet_status).toBe("active");
    expect(botRow.owner_uid).toBe(uid);
  });

  it("returns null on a second claim of the same code (race / double-submit)", async () => {
    const code = testCode();
    const botId = testBotId();
    await insertPendingBot(botId);
    await insertPairingCode({ code, status: "registered", botId });

    const first = await pairingWaitlistMethods.claimRegisteredPairingCode(code, testUid());
    expect(first).not.toBeNull();

    const second = await pairingWaitlistMethods.claimRegisteredPairingCode(code, testUid());
    expect(second).toBeNull();
  });

  it("returns null when the code is still pending (no bot registered yet)", async () => {
    const code = testCode();
    await insertPairingCode({ code });

    const bot = await pairingWaitlistMethods.claimRegisteredPairingCode(code, testUid());
    expect(bot).toBeNull();

    const row = await getCodeRow(code);
    expect(row.status).toBe("pending");
  });

  it("returns null when the registered code has no linked bot", async () => {
    const code = testCode();
    await insertPairingCode({ code, status: "registered", botId: null });

    const bot = await pairingWaitlistMethods.claimRegisteredPairingCode(code, testUid());
    expect(bot).toBeNull();
  });

  it("does not steal a bot that already has an owner", async () => {
    const code = testCode();
    const botId = testBotId();
    const existingOwner = testUid();
    await insertPendingBot(botId);
    const p = getPool();
    await p.query(`UPDATE bots SET owner_uid = $1, wallet_status = 'active' WHERE bot_id = $2`, [existingOwner, botId]);
    await insertPairingCode({ code, status: "registered", botId });

    const bot = await pairingWaitlistMethods.claimRegisteredPairingCode(code, testUid());
    expect(bot).toBeNull();

    const botRow = await getBotRow(botId);
    expect(botRow.owner_uid).toBe(existingOwner);
  });
});

describe("adopt → register handoff invariant", () => {
  it("an adopted code still reads as pending with ownerUid set — the shape register-with-code activates against", async () => {
    const code = testCode();
    const uid = testUid();
    await insertPairingCode({ code });
    await pairingWaitlistMethods.adoptPairingCode(code, uid);

    const record = await pairingWaitlistMethods.getPairingCodeByCode(code);
    expect(record).not.toBeNull();
    expect(record!.status).toBe("pending");
    expect(record!.ownerUid).toBe(uid);
    expect(record!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
