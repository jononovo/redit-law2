import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { embed } from "../lib/embeddings/embed";
import * as fs from "fs";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const BATCH_SIZE = 50;
const POLL_INTERVAL_MS = 5000;

interface ExtractedProduct {
  name: string;
  price: number;
  currency: string;
  in_stock: boolean;
  image_url: string;
  description: string;
  product_type: string;
}

async function submitBatch(urls: string[]): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v1/batch/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      urls,
      formats: ["extract"],
      extract: {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            price: { type: "number" },
            currency: { type: "string" },
            in_stock: { type: "boolean" },
            image_url: { type: "string" },
            description: { type: "string" },
            product_type: { type: "string" },
          },
          required: ["name", "price"],
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl batch submit failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  if (!data.success) throw new Error("Batch submit returned success=false");
  return data.id;
}

async function pollBatch(batchId: string): Promise<any[]> {
  const maxAttempts = 120;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(
      `https://api.firecrawl.dev/v1/batch/scrape/${batchId}`,
      {
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
      },
    );

    if (!res.ok) {
      console.error(`  Poll error: ${res.status}`);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }

    const data = await res.json();
    if (data.status === "completed") {
      return data.data || [];
    }

    const completed = data.completed || 0;
    const total = data.total || 0;
    process.stdout.write(
      `\r  Polling batch ${batchId.slice(0, 8)}... ${completed}/${total}`,
    );

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error("Batch polling timed out");
}

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
  const urlsFile = process.argv[3];

  if (!domainArg || !urlsFile) {
    console.error(
      "Usage: npx tsx scripts/ingest-firecrawl-batch.ts <domain> <urls_file>",
    );
    console.error(
      "Example: npx tsx scripts/ingest-firecrawl-batch.ts patagonia.com /tmp/patagonia-urls.txt",
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
  console.log(
    `Ingesting products for ${brandRow.name} (brand_id: ${brandRow.id})`,
  );

  const urls = fs
    .readFileSync(urlsFile, "utf8")
    .split("\n")
    .filter(Boolean);
  console.log(`Loaded ${urls.length} URLs from ${urlsFile}`);

  console.log("Loading embedding model...");
  await embed("warmup");
  console.log("Model ready\n");

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  const categoryCache = new Map<string, number | null>();

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(urls.length / BATCH_SIZE);
    console.log(
      `\nBatch ${batchNum}/${totalBatches} (${batch.length} URLs)...`,
    );

    try {
      const batchId = await submitBatch(batch);
      console.log(`  Submitted batch ${batchId.slice(0, 8)}`);

      const results = await pollBatch(batchId);
      console.log(`\n  Got ${results.length} results`);

      for (const result of results) {
        if (!result.extract?.name || !result.extract?.price) {
          totalErrors++;
          continue;
        }

        const ext = result.extract as ExtractedProduct;
        const productUrl = result.metadata?.sourceURL || result.metadata?.url || "";
        if (!productUrl) {
          totalErrors++;
          continue;
        }

        const priceCents = Math.round((ext.price || 0) * 100);
        if (priceCents <= 0) {
          totalErrors++;
          continue;
        }

        let categoryId: number | null = null;
        if (ext.product_type) {
          if (!categoryCache.has(ext.product_type)) {
            categoryCache.set(ext.product_type, await resolveCategory(ext.product_type));
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
          if (totalErrors <= 5) console.error(`  DB error on "${ext.name}":`, err);
        }
      }

      console.log(
        `  Running totals: ${totalInserted} new, ${totalUpdated} updated, ${totalErrors} errors`,
      );
    } catch (err) {
      console.error(`  Batch failed:`, err);
      totalErrors += batch.length;
    }
  }

  const totalCount = await db.execute(
    sql`SELECT count(*) as c FROM product_listings WHERE brand_id = ${brandRow.id}`,
  );

  console.log(
    `\nDone. ${totalInserted} inserted, ${totalUpdated} updated, ${totalErrors} errors.`,
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
