import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface MerchantRow {
  id: number;
  slug: string;
  name: string;
  domain: string;
}

async function main() {
  console.log("=== Product Refresh ===");
  console.log(new Date().toISOString());

  const merchants = await db.execute(
    sql`SELECT DISTINCT bi.id, bi.slug, bi.name, bi.domain
        FROM brand_index bi
        JOIN product_listings pl ON pl.brand_id = bi.id
        ORDER BY bi.name`,
  );

  const rows = merchants.rows as unknown as MerchantRow[];
  console.log(`Found ${rows.length} merchants with products\n`);

  let succeeded = 0;
  let failed = 0;

  for (const merchant of rows) {
    const feedSource = await db.execute(
      sql`SELECT DISTINCT feed_source FROM product_listings WHERE brand_id = ${merchant.id}`,
    );
    const source = (feedSource.rows[0] as any)?.feed_source || "shopify";

    console.log(`Refreshing ${merchant.name} (${merchant.domain}, source: ${source})...`);

    if (source === "shopify") {
      try {
        const { stdout, stderr } = await execAsync(
          `npx tsx scripts/ingest-shopify-products.ts ${merchant.domain}`,
          { timeout: 300_000 },
        );
        const lastLine = stdout.trim().split("\n").pop() || "";
        console.log(`  ${lastLine}`);
        succeeded++;
      } catch (err: any) {
        console.error(`  Failed: ${err.message?.slice(0, 100)}`);
        failed++;
      }
    } else if (source === "xml") {
      console.log(`  Skipping XML source (needs feed URL)`);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  const staleCount = await db.execute(
    sql`SELECT count(*) as c FROM product_listings WHERE last_synced < NOW() - INTERVAL '14 days'`,
  );

  console.log(`\n=== Summary ===`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  console.log(
    `Stale products (>14 days): ${(staleCount.rows[0] as any).c}`,
  );
}

main().catch((err) => {
  console.error("Refresh failed:", err);
  process.exit(1);
});
