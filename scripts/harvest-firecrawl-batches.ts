import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { embed } from "../lib/embeddings/embed";
import * as fs from "fs";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

async function resolveCategory(productType: string): Promise<number | null> {
  if (!productType) return null;
  const rows = await db.execute(
    sql`SELECT category_id FROM category_keywords
        WHERE keywords_tsv @@ websearch_to_tsquery('english', ${productType})
        ORDER BY ts_rank(keywords_tsv, websearch_to_tsquery('english', ${productType})) DESC
        LIMIT 1`,
  );
  return (rows.rows[0] as any)?.category_id ?? null;
}

async function main() {
  if (!FIRECRAWL_API_KEY) {
    console.error("FIRECRAWL_API_KEY not set");
    process.exit(1);
  }

  const domainArg = process.argv[2];
  const batchFile = process.argv[3];

  if (!domainArg || !batchFile) {
    console.error(
      "Usage: npx tsx scripts/harvest-firecrawl-batches.ts <domain> <batch_ids_json>",
    );
    process.exit(1);
  }

  const domain = domainArg.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

  const brand = await db.execute(
    sql`SELECT id, slug, name FROM brand_index WHERE domain = ${domain} OR domain = ${"www." + domain} LIMIT 1`,
  );
  if (!brand.rows[0]) {
    console.error(`No brand found for domain: ${domain}`);
    process.exit(1);
  }
  const brandRow = brand.rows[0] as any;

  const batchIds: string[] = JSON.parse(fs.readFileSync(batchFile, "utf8"));
  console.log(
    `Harvesting ${batchIds.length} batches for ${brandRow.name} (brand_id: ${brandRow.id})`,
  );

  console.log("Loading embedding model...");
  await embed("warmup");

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let pendingBatches = 0;
  const categoryCache = new Map<string, number | null>();

  for (const batchId of batchIds) {
    const res = await fetch(
      `https://api.firecrawl.dev/v1/batch/scrape/${batchId}`,
      { headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}` } },
    );

    if (!res.ok) {
      console.log(`  Batch ${batchId.slice(0, 8)}: HTTP ${res.status}`);
      continue;
    }

    const data = await res.json();
    if (data.status !== "completed") {
      console.log(
        `  Batch ${batchId.slice(0, 8)}: ${data.status} (${data.completed || 0}/${data.total || 0})`,
      );
      pendingBatches++;
      continue;
    }

    const results = data.data || [];
    const extracted = results.filter(
      (r: any) => r.extract?.name && r.extract?.price,
    );
    console.log(
      `  Batch ${batchId.slice(0, 8)}: ${extracted.length} products extracted`,
    );

    for (const result of extracted) {
      const ext = result.extract;
      const productUrl =
        result.metadata?.sourceURL || result.metadata?.url || "";
      if (!productUrl) continue;

      const priceCents = Math.round((ext.price || 0) * 100);
      if (priceCents <= 0) continue;

      let categoryId: number | null = null;
      if (ext.product_type) {
        if (!categoryCache.has(ext.product_type)) {
          categoryCache.set(
            ext.product_type,
            await resolveCategory(ext.product_type),
          );
        }
        categoryId = categoryCache.get(ext.product_type) ?? null;
      }

      const embedText =
        `${ext.name} ${ext.description || ""} ${ext.product_type || ""}`.slice(
          0,
          512,
        );
      const embedding = await embed(embedText);
      const feedItemId = productUrl
        .replace(/https?:\/\//, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .slice(0, 200);

      try {
        const existing = await db.execute(
          sql`SELECT id FROM product_listings WHERE brand_id = ${brandRow.id} AND feed_item_id = ${feedItemId}`,
        );

        if (existing.rows.length > 0) {
          await db.execute(
            sql`UPDATE product_listings SET
              name = ${ext.name},
              description = ${ext.description || null},
              price_cents = ${priceCents},
              currency = ${ext.currency || "USD"},
              in_stock = ${ext.in_stock !== false},
              image_url = ${ext.image_url || null},
              product_url = ${productUrl},
              category_id = ${categoryId},
              feed_source = ${"firecrawl"},
              embedding = ${`[${embedding.join(",")}]`}::vector,
              last_synced = NOW()
            WHERE id = ${(existing.rows[0] as any).id}`,
          );
          totalUpdated++;
        } else {
          await db.execute(
            sql`INSERT INTO product_listings (brand_id, name, description, price_cents, currency, in_stock, image_url, product_url, category_id, feed_source, feed_item_id, embedding)
            VALUES (${brandRow.id}, ${ext.name}, ${ext.description || null}, ${priceCents}, ${ext.currency || "USD"}, ${ext.in_stock !== false}, ${ext.image_url || null}, ${productUrl}, ${categoryId}, ${"firecrawl"}, ${feedItemId}, ${`[${embedding.join(",")}]`}::vector)`,
          );
          totalInserted++;
        }
      } catch (err) {
        totalErrors++;
        if (totalErrors <= 3)
          console.error(`  Error on "${ext.name}":`, err);
      }
    }
  }

  const totalCount = await db.execute(
    sql`SELECT count(*) as c FROM product_listings WHERE brand_id = ${brandRow.id}`,
  );

  console.log(
    `\nDone. ${totalInserted} inserted, ${totalUpdated} updated, ${totalErrors} errors, ${pendingBatches} batches still pending.`,
  );
  console.log(
    `Total products for ${brandRow.name}: ${(totalCount.rows[0] as any).c}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
