import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPool, closePool } from "../helpers";

describe("brand_claims table", () => {
  let pool: ReturnType<typeof getPool>;

  beforeAll(() => {
    pool = getPool();
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM brand_claims WHERE claimer_uid LIKE 'test_%'`);
    await closePool();
  });

  it("brand_claims table exists with expected columns", async () => {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'brand_claims' 
      ORDER BY ordinal_position
    `);
    const columns = result.rows.map((r: { column_name: string }) => r.column_name);
    expect(columns).toContain("id");
    expect(columns).toContain("brand_slug");
    expect(columns).toContain("claimer_uid");
    expect(columns).toContain("claimer_email");
    expect(columns).toContain("claim_type");
    expect(columns).toContain("status");
    expect(columns).toContain("rejection_reason");
    expect(columns).toContain("verified_at");
    expect(columns).toContain("revoked_at");
    expect(columns).toContain("reviewed_by");
    expect(columns).toContain("created_at");
  });

  it("partial unique index prevents two verified claims for same brand", async () => {
    const slug = "test-brand-" + Date.now();
    await pool.query(`
      INSERT INTO brand_claims (brand_slug, claimer_uid, claimer_email, claim_type, status, verified_at)
      VALUES ($1, 'test_user_1', 'a@corp.com', 'domain_match', 'verified', now())
    `, [slug]);

    await expect(pool.query(`
      INSERT INTO brand_claims (brand_slug, claimer_uid, claimer_email, claim_type, status, verified_at)
      VALUES ($1, 'test_user_2', 'b@corp.com', 'domain_match', 'verified', now())
    `, [slug])).rejects.toThrow();

    await pool.query(`DELETE FROM brand_claims WHERE brand_slug = $1`, [slug]);
  });

  it("allows multiple pending claims for same brand", async () => {
    const slug = "test-brand-pending-" + Date.now();
    await pool.query(`
      INSERT INTO brand_claims (brand_slug, claimer_uid, claimer_email, claim_type, status)
      VALUES ($1, 'test_user_1', 'a@corp.com', 'manual_review', 'pending')
    `, [slug]);
    await pool.query(`
      INSERT INTO brand_claims (brand_slug, claimer_uid, claimer_email, claim_type, status)
      VALUES ($1, 'test_user_2', 'b@corp.com', 'manual_review', 'pending')
    `, [slug]);

    const result = await pool.query(`SELECT count(*) FROM brand_claims WHERE brand_slug = $1`, [slug]);
    expect(parseInt(result.rows[0].count)).toBe(2);

    await pool.query(`DELETE FROM brand_claims WHERE brand_slug = $1`, [slug]);
  });

  it("allows a new verified claim after previous one was revoked", async () => {
    const slug = "test-brand-revoke-" + Date.now();
    await pool.query(`
      INSERT INTO brand_claims (brand_slug, claimer_uid, claimer_email, claim_type, status, revoked_at)
      VALUES ($1, 'test_user_1', 'a@corp.com', 'domain_match', 'revoked', now())
    `, [slug]);
    await pool.query(`
      INSERT INTO brand_claims (brand_slug, claimer_uid, claimer_email, claim_type, status, verified_at)
      VALUES ($1, 'test_user_2', 'b@corp.com', 'domain_match', 'verified', now())
    `, [slug]);

    const result = await pool.query(
      `SELECT count(*) FROM brand_claims WHERE brand_slug = $1 AND status = 'verified'`, [slug]
    );
    expect(parseInt(result.rows[0].count)).toBe(1);

    await pool.query(`DELETE FROM brand_claims WHERE brand_slug = $1`, [slug]);
  });
});
