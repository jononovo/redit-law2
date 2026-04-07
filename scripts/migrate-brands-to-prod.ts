import { Pool } from "pg";

const DEV_URL = process.env.DATABASE_URL!;
const PROD_URL = process.argv[2];

if (!PROD_URL) {
  console.error("Usage: npx tsx scripts/migrate-brands-to-prod.ts <PRODUCTION_DATABASE_URL>");
  process.exit(1);
}

const dev = new Pool({ connectionString: DEV_URL });
const prod = new Pool({ connectionString: PROD_URL });

const JSONB_COLS = new Set(["brand_data", "score_breakdown", "recommendations"]);

async function main() {
  console.log("Testing production connection...");
  await prod.query("SELECT 1");
  console.log("Production connection OK\n");

  const { rows: devBrands } = await dev.query("SELECT * FROM brand_index ORDER BY id");
  console.log(`Found ${devBrands.length} brands in dev`);

  const { rows: prodBrands } = await prod.query("SELECT id, domain FROM brand_index ORDER BY id");
  console.log(`Found ${prodBrands.length} brands in prod`);

  const prodIds = new Set(prodBrands.map((r: any) => r.id));
  const prodDomains = new Set(prodBrands.map((r: any) => r.domain));

  let added = 0;
  let skipped = 0;

  for (const b of devBrands) {
    if (prodIds.has(b.id)) {
      console.log(`  SKIP id ${b.id} ${b.name} (${b.domain}) — ID already exists in prod`);
      skipped++;
      continue;
    }

    if (prodDomains.has(b.domain)) {
      console.log(`  SKIP id ${b.id} ${b.name} (${b.domain}) — domain already in prod under different ID`);
      skipped++;
      continue;
    }

    const cols = Object.keys(b);
    const vals = Object.values(b);
    const placeholders = cols.map((col, i) => {
      if (JSONB_COLS.has(col)) {
        return `$${i + 1}::jsonb`;
      }
      return `$${i + 1}`;
    });

    const stringVals = vals.map((v, i) => {
      if (JSONB_COLS.has(cols[i]) && v !== null && typeof v === "object") {
        return JSON.stringify(v);
      }
      return v;
    });

    try {
      await prod.query(
        `INSERT INTO brand_index (${cols.join(",")}) VALUES (${placeholders.join(",")}) ON CONFLICT (id) DO NOTHING`,
        stringVals
      );
      console.log(`  ADD  id ${b.id} ${b.name} (${b.domain})`);
      added++;
    } catch (err: any) {
      console.error(`  FAIL id ${b.id} ${b.name} (${b.domain}) — ${err.message}`);
    }
  }

  await prod.query(`SELECT setval('brand_index_id_seq', (SELECT COALESCE(MAX(id),0) FROM brand_index))`);

  console.log(`\nDone: ${added} added, ${skipped} skipped`);

  const { rows: final } = await prod.query("SELECT count(*) as c FROM brand_index");
  console.log(`Production brand_index now has ${final[0].c} brands`);

  await dev.end();
  await prod.end();
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
