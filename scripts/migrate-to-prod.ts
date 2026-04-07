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

async function main() {
  console.log("Testing production connection...");
  await prod.query("SELECT 1");
  console.log("Production connection OK\n");

  const prodCounts = await prod.query(`
    SELECT 
      (SELECT count(*) FROM product_categories) as cats,
      (SELECT count(*) FROM category_keywords) as kw,
      (SELECT count(*) FROM brand_categories) as bc,
      (SELECT count(*) FROM product_listings) as pl
  `);
  const pc = prodCounts.rows[0];
  console.log(`Production current: ${pc.cats} categories, ${pc.kw} keywords, ${pc.bc} brand_cats, ${pc.pl} products\n`);

  if (Number(pc.cats) >= 5638) {
    console.log("Phase 1: product_categories — SKIP (already complete)");
  }
  if (Number(pc.kw) >= 1286) {
    console.log("Phase 2: category_keywords — SKIP (already complete)");
  }
  if (Number(pc.bc) >= 181) {
    console.log("Phase 3: brand_categories — SKIP (already complete)");
  }

  // Clean orphaned brand_categories (dev IDs 107, 152, 153 that don't exist in prod)
  console.log("\nCleaning orphaned brand_categories...");
  const cleaned = await prod.query(
    `DELETE FROM brand_categories WHERE NOT EXISTS (SELECT 1 FROM brand_index WHERE brand_index.id = brand_categories.brand_id)`
  );
  console.log(`  Removed ${cleaned.rowCount} orphaned rows`);

  // Phase 4: product_listings — only insert missing ones
  console.log("\n=== Phase 4: product_listings (missing only) ===");

  const { rows: existingIds } = await prod.query("SELECT id FROM product_listings");
  const existingSet = new Set(existingIds.map((r: any) => r.id));
  console.log(`  Already in prod: ${existingSet.size}`);

  const { rows: allDev } = await dev.query("SELECT * FROM product_listings ORDER BY id");
  const missing = allDev.filter((r: any) => !existingSet.has(r.id));
  console.log(`  Missing from prod: ${missing.length}`);

  if (missing.length === 0) {
    console.log("  Nothing to insert!");
  } else {
    let inserted = 0;
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      for (const r of batch) {
        await prod.query(
          `INSERT INTO product_listings (id, brand_id, name, description, price_cents, currency, in_stock, image_url, product_url, category_id, brand_name, upc, gtin, mpn, feed_source, feed_item_id, embedding, last_synced, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.brand_id, r.name, r.description, r.price_cents, r.currency, r.in_stock, r.image_url, r.product_url, r.category_id, r.brand_name, r.upc, r.gtin, r.mpn, r.feed_source, r.feed_item_id, r.embedding, r.last_synced, r.created_at]
        );
      }
      inserted += batch.length;
      process.stdout.write(`  Inserted ${inserted}/${missing.length}\r`);
    }
    console.log(`  Inserted ${inserted}/${missing.length} — done`);
    await prod.query(`SELECT setval('product_listings_id_seq', (SELECT COALESCE(MAX(id),0) FROM product_listings))`);
  }

  // Verify
  console.log("\n=== Verification ===");
  const counts = await Promise.all([
    prod.query("SELECT count(*) as c FROM product_categories"),
    prod.query("SELECT count(*) as c FROM category_keywords"),
    prod.query("SELECT count(*) as c FROM brand_categories"),
    prod.query("SELECT count(*) as c FROM product_listings"),
    prod.query("SELECT count(*) as c FROM brand_index"),
  ]);
  console.log(`  product_categories: ${counts[0].rows[0].c}`);
  console.log(`  category_keywords:  ${counts[1].rows[0].c}`);
  console.log(`  brand_categories:   ${counts[2].rows[0].c}`);
  console.log(`  product_listings:   ${counts[3].rows[0].c}`);
  console.log(`  brand_index:        ${counts[4].rows[0].c}`);

  await dev.end();
  await prod.end();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
