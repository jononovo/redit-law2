import { Pool } from "pg";

const DEV_URL = process.env.DATABASE_URL!;
const PROD_URL = process.argv[2];

if (!PROD_URL) {
  console.error("Usage: npx tsx scripts/migrate-to-prod.ts <PRODUCTION_DATABASE_URL>");
  process.exit(1);
}

const dev = new Pool({ connectionString: DEV_URL });
const prod = new Pool({ connectionString: PROD_URL });

const BATCH_SIZE = 50;

async function migrateTable(name: string, query: string, insertFn: (rows: any[]) => Promise<void>) {
  console.log(`\n=== ${name} ===`);
  const { rows } = await dev.query(query);
  console.log(`  Found ${rows.length} rows in dev`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await insertFn(batch);
    inserted += batch.length;
    process.stdout.write(`  Inserted ${inserted}/${rows.length}\r`);
  }
  console.log(`  Inserted ${inserted}/${rows.length} — done`);
}

async function main() {
  console.log("Testing production connection...");
  const test = await prod.query("SELECT 1");
  console.log("Production connection OK");

  // Phase 1: product_categories
  await migrateTable(
    "Phase 1: product_categories",
    "SELECT * FROM product_categories ORDER BY id",
    async (batch) => {
      for (const r of batch) {
        await prod.query(
          `INSERT INTO product_categories (id, name, slug, parent_id, depth, path) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.name, r.slug, r.parent_id, r.depth, r.path]
        );
      }
    }
  );
  await prod.query(`SELECT setval('product_categories_id_seq', (SELECT COALESCE(MAX(id),0) FROM product_categories))`);

  // Phase 2: category_keywords
  await migrateTable(
    "Phase 2: category_keywords",
    "SELECT * FROM category_keywords ORDER BY id",
    async (batch) => {
      for (const r of batch) {
        await prod.query(
          `INSERT INTO category_keywords (id, category_id, category_name, category_path, keywords, keywords_tsv, generated_at) VALUES ($1,$2,$3,$4,$5,$6::tsvector,$7) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.category_id, r.category_name, r.category_path, r.keywords, r.keywords_tsv, r.generated_at]
        );
      }
    }
  );
  await prod.query(`SELECT setval('category_keywords_id_seq', (SELECT COALESCE(MAX(id),0) FROM category_keywords))`);

  // Phase 3: brand_categories
  await migrateTable(
    "Phase 3: brand_categories",
    "SELECT * FROM brand_categories ORDER BY id",
    async (batch) => {
      for (const r of batch) {
        await prod.query(
          `INSERT INTO brand_categories (id, brand_id, category_id, is_primary, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.brand_id, r.category_id, r.is_primary, r.created_at]
        );
      }
    }
  );
  await prod.query(`SELECT setval('brand_categories_id_seq', (SELECT COALESCE(MAX(id),0) FROM brand_categories))`);

  // Phase 4: product_listings
  await migrateTable(
    "Phase 4: product_listings",
    "SELECT * FROM product_listings ORDER BY id",
    async (batch) => {
      for (const r of batch) {
        await prod.query(
          `INSERT INTO product_listings (id, brand_id, name, description, price_cents, currency, in_stock, image_url, product_url, category_id, brand_name, upc, gtin, mpn, feed_source, feed_item_id, embedding, last_synced, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.brand_id, r.name, r.description, r.price_cents, r.currency, r.in_stock, r.image_url, r.product_url, r.category_id, r.brand_name, r.upc, r.gtin, r.mpn, r.feed_source, r.feed_item_id, r.embedding, r.last_synced, r.created_at]
        );
      }
    }
  );
  await prod.query(`SELECT setval('product_listings_id_seq', (SELECT COALESCE(MAX(id),0) FROM product_listings))`);

  // Verify
  console.log("\n=== Verification ===");
  const counts = await Promise.all([
    prod.query("SELECT count(*) as c FROM product_categories"),
    prod.query("SELECT count(*) as c FROM category_keywords"),
    prod.query("SELECT count(*) as c FROM brand_categories"),
    prod.query("SELECT count(*) as c FROM product_listings"),
  ]);
  console.log(`  product_categories: ${counts[0].rows[0].c}`);
  console.log(`  category_keywords:  ${counts[1].rows[0].c}`);
  console.log(`  brand_categories:   ${counts[2].rows[0].c}`);
  console.log(`  product_listings:   ${counts[3].rows[0].c}`);

  await dev.end();
  await prod.end();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
