import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { embed } from "../features/product-index/embeddings/embed";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const MAX_PRODUCTS = 500;

interface FirecrawlResult {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      ogImage?: string;
      sourceURL?: string;
    };
    extract?: Record<string, unknown>;
  };
}

interface ExtractedProduct {
  name: string;
  price_cents: number;
  currency: string;
  in_stock: boolean;
  image_url: string | null;
  product_url: string;
  description: string | null;
  product_type: string | null;
}

async function scrapeProductPage(url: string): Promise<ExtractedProduct | null> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
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
    console.error(`  Firecrawl ${res.status}: ${await res.text()}`);
    return null;
  }

  const data = (await res.json()) as FirecrawlResult;
  if (!data.success || !data.data?.extract) return null;

  const ext = data.data.extract as any;
  if (!ext.name || !ext.price) return null;

  return {
    name: ext.name,
    price_cents: Math.round((ext.price || 0) * 100),
    currency: ext.currency || "USD",
    in_stock: ext.in_stock !== false,
    image_url: ext.image_url || data.data.metadata?.ogImage || null,
    product_url: url,
    description: ext.description || null,
    product_type: ext.product_type || null,
  };
}

async function discoverProductUrls(domain: string): Promise<string[]> {
  console.log(`  Discovering product URLs via sitemap...`);
  const sitemapUrls = [
    `https://${domain}/sitemap.xml`,
    `https://www.${domain}/sitemap.xml`,
    `https://${domain}/sitemap_products.xml`,
    `https://www.${domain}/sitemap_products_1.xml`,
  ];

  let productUrls: string[] = [];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const res = await fetch(sitemapUrl, {
        headers: { "User-Agent": "brands.sh product indexer" },
        redirect: "follow",
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const urls = [...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)]
        .map((m) => m[1])
        .filter(
          (u) =>
            u.includes("/product") ||
            u.includes("/p/") ||
            u.includes("/shop/") ||
            u.includes("/item/"),
        );

      if (urls.length > 0) {
        console.log(`  Found ${urls.length} product URLs in ${sitemapUrl}`);
        productUrls.push(...urls);
      }
    } catch {
      continue;
    }
  }

  if (productUrls.length === 0) {
    console.log(`  Trying Firecrawl map...`);
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/map", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: `https://${domain}`,
          search: "product",
          limit: MAX_PRODUCTS,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.links)) {
          productUrls = data.links.filter(
            (u: string) =>
              u.includes("/product") ||
              u.includes("/p/") ||
              u.includes("/shop/") ||
              u.includes("/item/"),
          );
          console.log(
            `  Found ${productUrls.length} product URLs via Firecrawl map`,
          );
        }
      }
    } catch {
      console.error(`  Firecrawl map failed`);
    }
  }

  return [...new Set(productUrls)].slice(0, MAX_PRODUCTS);
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
  const maxProducts = parseInt(process.argv[3] || "100");

  if (!domainArg) {
    console.error(
      "Usage: npx tsx scripts/crawl-merchant-products.ts <domain> [max_products]",
    );
    process.exit(1);
  }

  const domain = domainArg.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const brand = await db.execute(
    sql`SELECT id, slug, name FROM brand_index WHERE domain = ${domain} LIMIT 1`,
  );

  if (!brand.rows[0]) {
    console.error(`No brand found in brand_index for domain: ${domain}`);
    process.exit(1);
  }

  const brandRow = brand.rows[0] as any;
  console.log(
    `Crawling products for ${brandRow.name} (${domain}, brand_id: ${brandRow.id})`,
  );

  const urls = await discoverProductUrls(domain);
  if (urls.length === 0) {
    console.log("No product URLs found.");
    process.exit(0);
  }

  const toProcess = urls.slice(0, maxProducts);
  console.log(`\nProcessing ${toProcess.length} product URLs...`);

  console.log("Loading embedding model...");
  await embed("warmup");
  console.log("Model ready\n");

  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const categoryCache = new Map<string, number | null>();

  for (let i = 0; i < toProcess.length; i++) {
    const url = toProcess[i];
    try {
      const product = await scrapeProductPage(url);
      if (!product || product.price_cents <= 0) {
        errors++;
        continue;
      }

      let categoryId: number | null = null;
      if (product.product_type) {
        categoryId = categoryCache.get(product.product_type) ?? null;
        if (categoryId === undefined) {
          categoryId = await resolveCategory(product.product_type);
          categoryCache.set(product.product_type, categoryId);
        }
      }

      const embedText =
        `${product.name} ${product.description || ""} ${product.product_type || ""}`.slice(
          0,
          512,
        );
      const embedding = await embed(embedText);

      const feedItemId = url
        .replace(/https?:\/\//, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .slice(0, 200);

      const existing = await db.execute(
        sql`SELECT id FROM product_listings WHERE brand_id = ${brandRow.id} AND feed_item_id = ${feedItemId}`,
      );

      if (existing.rows.length > 0) {
        await db.execute(
          sql`UPDATE product_listings SET
            name = ${product.name},
            description = ${product.description},
            price_cents = ${product.price_cents},
            currency = ${product.currency},
            in_stock = ${product.in_stock},
            image_url = ${product.image_url},
            product_url = ${product.product_url},
            category_id = ${categoryId},
            feed_source = ${"firecrawl"},
            embedding = ${`[${embedding.join(",")}]`}::vector,
            last_synced = NOW()
          WHERE id = ${(existing.rows[0] as any).id}`,
        );
        updated++;
      } else {
        await db.execute(
          sql`INSERT INTO product_listings (brand_id, name, description, price_cents, currency, in_stock, image_url, product_url, category_id, feed_source, feed_item_id, embedding)
          VALUES (${brandRow.id}, ${product.name}, ${product.description}, ${product.price_cents}, ${product.currency}, ${product.in_stock}, ${product.image_url}, ${product.product_url}, ${categoryId}, ${"firecrawl"}, ${feedItemId}, ${`[${embedding.join(",")}]`}::vector)`,
        );
        inserted++;
      }

      if ((i + 1) % 5 === 0 || i === toProcess.length - 1) {
        console.log(
          `  Progress: ${i + 1}/${toProcess.length} (${inserted} new, ${updated} updated, ${errors} skipped)`,
        );
      }

      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      errors++;
      if (errors <= 5)
        console.error(`  Error on ${url}:`, err);
    }
  }

  const totalCount = await db.execute(
    sql`SELECT count(*) as c FROM product_listings WHERE brand_id = ${brandRow.id}`,
  );

  console.log(
    `\nDone. ${inserted} inserted, ${updated} updated, ${errors} skipped.`,
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
