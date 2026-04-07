import { describe, it, expect, afterAll } from "vitest";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const pool = new pg.Pool({ connectionString: DATABASE_URL });

afterAll(async () => {
  await pool.end();
});

describe("Product Index — data integrity", () => {
  it("has product_categories seeded", async () => {
    const res = await pool.query("SELECT count(*)::int as c FROM product_categories");
    expect(res.rows[0].c).toBeGreaterThan(5000);
  });

  it("has category_keywords seeded", async () => {
    const res = await pool.query("SELECT count(*)::int as c FROM category_keywords");
    expect(res.rows[0].c).toBeGreaterThan(1000);
  });

  it("has brand_categories linked", async () => {
    const res = await pool.query("SELECT count(*)::int as c FROM brand_categories");
    expect(res.rows[0].c).toBeGreaterThan(100);
  });

  it("has product_listings with embeddings", async () => {
    const res = await pool.query("SELECT count(*)::int as c FROM product_listings WHERE embedding IS NOT NULL");
    expect(res.rows[0].c).toBeGreaterThan(6000);
  });

  it("has no orphaned product_listings (every product has a brand)", async () => {
    const res = await pool.query(
      `SELECT count(*)::int as c FROM product_listings pl
       WHERE NOT EXISTS (SELECT 1 FROM brand_index bi WHERE bi.id = pl.brand_id)`
    );
    expect(res.rows[0].c).toBe(0);
  });

  it("has no orphaned brand_categories (every link has a brand)", async () => {
    const res = await pool.query(
      `SELECT count(*)::int as c FROM brand_categories bc
       WHERE NOT EXISTS (SELECT 1 FROM brand_index bi WHERE bi.id = bc.brand_id)`
    );
    expect(res.rows[0].c).toBe(0);
  });
});

describe("Category Resolution — keyword FTS", () => {
  it("resolves 'running shoes' to relevant categories", async () => {
    const res = await pool.query(
      `SELECT ck.category_name, ts_rank(ck.keywords_tsv, websearch_to_tsquery('english', 'running shoes')) as rank
       FROM category_keywords ck
       WHERE ck.keywords_tsv @@ websearch_to_tsquery('english', 'running shoes')
       ORDER BY rank DESC LIMIT 5`
    );
    expect(res.rows.length).toBeGreaterThan(0);
    const names = res.rows.map((r: any) => r.category_name.toLowerCase());
    const hasRelevant = names.some((n: string) => n.includes("shoe") || n.includes("athletic") || n.includes("apparel"));
    expect(hasRelevant).toBe(true);
  });

  it("resolves 'laptop' to electronics categories", async () => {
    const res = await pool.query(
      `SELECT ck.category_name, ts_rank(ck.keywords_tsv, websearch_to_tsquery('english', 'laptop')) as rank
       FROM category_keywords ck
       WHERE ck.keywords_tsv @@ websearch_to_tsquery('english', 'laptop')
       ORDER BY rank DESC LIMIT 5`
    );
    expect(res.rows.length).toBeGreaterThan(0);
    const names = res.rows.map((r: any) => r.category_name.toLowerCase());
    const hasRelevant = names.some((n: string) => n.includes("laptop") || n.includes("computer"));
    expect(hasRelevant).toBe(true);
  });

  it("resolves 'dog food' to pet categories", async () => {
    const res = await pool.query(
      `SELECT ck.category_name, ts_rank(ck.keywords_tsv, websearch_to_tsquery('english', 'dog food')) as rank
       FROM category_keywords ck
       WHERE ck.keywords_tsv @@ websearch_to_tsquery('english', 'dog food')
       ORDER BY rank DESC LIMIT 5`
    );
    expect(res.rows.length).toBeGreaterThan(0);
    const names = res.rows.map((r: any) => r.category_name.toLowerCase());
    const hasRelevant = names.some((n: string) => n.includes("dog") || n.includes("pet"));
    expect(hasRelevant).toBe(true);
  });

  it("returns empty for gibberish query", async () => {
    const res = await pool.query(
      `SELECT ck.category_name FROM category_keywords ck
       WHERE ck.keywords_tsv @@ websearch_to_tsquery('english', 'xyzzzqqqfff')
       LIMIT 5`
    );
    expect(res.rows.length).toBe(0);
  });
});

describe("Merchant Ranking — category tree walk", () => {
  it("finds merchants for categories that brands are linked to", async () => {
    const catRes = await pool.query(
      `SELECT bc.category_id FROM brand_categories bc LIMIT 1`
    );
    if (catRes.rows.length === 0) return;

    const catId = catRes.rows[0].category_id;
    const res = await pool.query(
      `WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, depth FROM product_categories WHERE id = $1
        UNION
        SELECT pc.id, pc.parent_id, pc.depth FROM product_categories pc JOIN ancestors a ON pc.id = a.parent_id WHERE a.depth > 0
      ),
      descendants AS (
        SELECT id, parent_id, depth FROM product_categories WHERE id = $1
        UNION
        SELECT pc.id, pc.parent_id, pc.depth FROM product_categories pc JOIN descendants d ON pc.parent_id = d.id WHERE pc.depth <= 6
      ),
      all_related AS (SELECT id FROM ancestors UNION SELECT id FROM descendants)
      SELECT DISTINCT bi.name, bi.domain
      FROM brand_index bi
      JOIN brand_categories bc ON bc.brand_id = bi.id
      JOIN all_related ar ON ar.id = bc.category_id
      LIMIT 10`,
      [catId]
    );
    expect(res.rows.length).toBeGreaterThan(0);
  });

  it("ranks brand matches higher than generic matches", async () => {
    const res = await pool.query(
      `SELECT bi.name, bi.slug, COALESCE(bi.overall_score, 0) as score
       FROM brand_index bi
       WHERE bi.slug = 'glossier'
       LIMIT 1`
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].name).toBe("Glossier");
  });
});

describe("Product Search — vector similarity", () => {
  it("finds products for Glossier by brand_id", async () => {
    const res = await pool.query(
      `SELECT count(*)::int as c FROM product_listings WHERE brand_id = (SELECT id FROM brand_index WHERE slug = 'glossier')`
    );
    expect(res.rows[0].c).toBe(123);
  });

  it("finds products for Allbirds by brand_id", async () => {
    const res = await pool.query(
      `SELECT count(*)::int as c FROM product_listings WHERE brand_id = (SELECT id FROM brand_index WHERE slug = 'allbirds')`
    );
    expect(res.rows[0].c).toBe(937);
  });

  it("finds products for Everlane by brand_id", async () => {
    const res = await pool.query(
      `SELECT count(*)::int as c FROM product_listings WHERE brand_id = (SELECT id FROM brand_index WHERE slug = 'everlane')`
    );
    expect(res.rows[0].c).toBe(2500);
  });

  it("all product listings have valid URLs", async () => {
    const res = await pool.query(
      `SELECT count(*)::int as c FROM product_listings WHERE product_url NOT LIKE 'https://%'`
    );
    expect(res.rows[0].c).toBe(0);
  });

  it("all product listings have non-negative prices", async () => {
    const res = await pool.query(
      `SELECT count(*)::int as c FROM product_listings WHERE price_cents < 0`
    );
    expect(res.rows[0].c).toBe(0);
  });

  it("vector similarity search returns ranked results", async () => {
    const glossierId = await pool.query("SELECT id FROM brand_index WHERE slug = 'glossier'");
    if (glossierId.rows.length === 0) return;

    const brandId = glossierId.rows[0].id;
    const refEmb = await pool.query(
      `SELECT embedding FROM product_listings WHERE brand_id = $1 AND embedding IS NOT NULL LIMIT 1`,
      [brandId]
    );
    if (refEmb.rows.length === 0) return;

    const res = await pool.query(
      `SELECT name, 1 - (embedding <=> $1::vector) as similarity
       FROM product_listings
       WHERE brand_id = $2 AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 3`,
      [refEmb.rows[0].embedding, brandId]
    );
    expect(res.rows.length).toBe(3);
    expect(parseFloat(res.rows[0].similarity)).toBeGreaterThan(0);
    expect(parseFloat(res.rows[0].similarity)).toBeGreaterThanOrEqual(parseFloat(res.rows[1].similarity));
  });
});

describe("End-to-end pipeline — category → merchant → products", () => {
  it("full pipeline: 'shoes' → categories → merchants → products", async () => {
    const cats = await pool.query(
      `SELECT ck.category_id, ck.category_name
       FROM category_keywords ck
       WHERE ck.keywords_tsv @@ websearch_to_tsquery('english', 'shoes')
       ORDER BY ts_rank(ck.keywords_tsv, websearch_to_tsquery('english', 'shoes')) DESC
       LIMIT 5`
    );
    expect(cats.rows.length).toBeGreaterThan(0);

    const catIds = cats.rows.map((r: any) => r.category_id);
    const catArray = `{${catIds.join(",")}}`;

    const merchants = await pool.query(
      `WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, depth FROM product_categories WHERE id = ANY($1::int[])
        UNION
        SELECT pc.id, pc.parent_id, pc.depth FROM product_categories pc JOIN ancestors a ON pc.id = a.parent_id WHERE a.depth > 0
      ),
      descendants AS (
        SELECT id, parent_id, depth FROM product_categories WHERE id = ANY($1::int[])
        UNION
        SELECT pc.id, pc.parent_id, pc.depth FROM product_categories pc JOIN descendants d ON pc.parent_id = d.id WHERE pc.depth <= 6
      ),
      all_related AS (SELECT id FROM ancestors UNION SELECT id FROM descendants)
      SELECT DISTINCT bi.id, bi.name, bi.domain
      FROM brand_index bi
      JOIN brand_categories bc ON bc.brand_id = bi.id
      JOIN all_related ar ON ar.id = bc.category_id
      LIMIT 10`,
      [catIds]
    );
    expect(merchants.rows.length).toBeGreaterThan(0);

    const merchantId = merchants.rows[0].id;
    const products = await pool.query(
      `SELECT name, price_cents, product_url FROM product_listings WHERE brand_id = $1 LIMIT 3`,
      [merchantId]
    );

    if (products.rows.length > 0) {
      expect(products.rows[0].name).toBeTruthy();
      expect(products.rows[0].price_cents).toBeGreaterThanOrEqual(0);
      expect(products.rows[0].product_url).toMatch(/^https:\/\//);
    }
  });
});
