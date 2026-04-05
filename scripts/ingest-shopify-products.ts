import { db } from "../server/db";
import { productListings, brandIndex, categoryKeywords } from "../shared/schema";
import { sql, eq } from "drizzle-orm";
import { embed } from "../lib/embeddings/embed";

const PRODUCTS_PER_PAGE = 250;
const MAX_PAGES = 10;

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: {
    id: number;
    title: string;
    price: string;
    available: boolean;
    sku: string | null;
    barcode: string | null;
  }[];
  images: {
    src: string;
  }[];
}

async function fetchShopifyProducts(domain: string): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://${domain}/products.json?limit=${PRODUCTS_PER_PAGE}&page=${page}`;
    console.log(`  Fetching page ${page}...`);

    const res = await fetch(url, {
      headers: { "User-Agent": "brands.sh product indexer" },
    });

    if (!res.ok) {
      console.error(`  HTTP ${res.status} fetching ${url}`);
      break;
    }

    const data = await res.json();
    const pageProducts = data.products as ShopifyProduct[];

    if (!pageProducts || pageProducts.length === 0) break;

    products.push(...pageProducts);
    console.log(`  Got ${pageProducts.length} products (total: ${products.length})`);

    if (pageProducts.length < PRODUCTS_PER_PAGE) break;

    await new Promise((r) => setTimeout(r, 500));
  }

  return products;
}

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim().slice(0, 500);
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
  const domainArg = process.argv[2];
  if (!domainArg) {
    console.error("Usage: npx tsx scripts/ingest-shopify-products.ts <domain>");
    console.error("Example: npx tsx scripts/ingest-shopify-products.ts glossier.com");
    process.exit(1);
  }

  const domain = domainArg.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const brand = await db.execute(
    sql`SELECT id, slug, name FROM brand_index WHERE domain = ${domain} LIMIT 1`,
  );

  if (!brand.rows[0]) {
    console.error(`No brand found in brand_index for domain: ${domain}`);
    console.error("Run a scan first to add this merchant to the index.");
    process.exit(1);
  }

  const brandRow = brand.rows[0] as any;
  console.log(`Ingesting products for ${brandRow.name} (${domain}, brand_id: ${brandRow.id})`);

  console.log("\nFetching products from Shopify...");
  const products = await fetchShopifyProducts(domain);
  console.log(`Fetched ${products.length} products total`);

  if (products.length === 0) {
    console.log("No products found. Is this a Shopify store?");
    process.exit(0);
  }

  console.log("\nLoading embedding model...");
  await embed("warmup");
  console.log("Model ready");

  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const categoryCache = new Map<string, number | null>();

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const variant = product.variants[0];
    if (!variant) continue;

    const priceCents = Math.round(parseFloat(variant.price) * 100);
    if (isNaN(priceCents) || priceCents <= 0) continue;

    const description = stripHtml(product.body_html);
    const embedText = `${product.title} ${product.vendor} ${product.product_type} ${description}`.slice(0, 512);

    try {
      let categoryId = categoryCache.get(product.product_type);
      if (categoryId === undefined) {
        categoryId = await resolveCategory(product.product_type);
        categoryCache.set(product.product_type, categoryId);
      }

      const embedding = await embed(embedText);

      const feedItemId = String(product.id);

      const existing = await db.execute(
        sql`SELECT id FROM product_listings WHERE brand_id = ${brandRow.id} AND feed_item_id = ${feedItemId}`,
      );

      if (existing.rows.length > 0) {
        await db.execute(
          sql`UPDATE product_listings SET
            name = ${product.title},
            description = ${description || null},
            price_cents = ${priceCents},
            in_stock = ${variant.available ?? true},
            image_url = ${product.images[0]?.src || null},
            product_url = ${"https://" + domain + "/products/" + product.handle},
            category_id = ${categoryId},
            brand_name = ${product.vendor},
            gtin = ${variant.barcode || null},
            feed_source = ${"shopify"},
            embedding = ${`[${embedding.join(",")}]`}::vector,
            last_synced = NOW()
          WHERE id = ${(existing.rows[0] as any).id}`,
        );
        updated++;
      } else {
        await db.execute(
          sql`INSERT INTO product_listings (brand_id, name, description, price_cents, currency, in_stock, image_url, product_url, category_id, brand_name, gtin, feed_source, feed_item_id, embedding)
          VALUES (${brandRow.id}, ${product.title}, ${description || null}, ${priceCents}, ${"USD"}, ${variant.available ?? true}, ${product.images[0]?.src || null}, ${"https://" + domain + "/products/" + product.handle}, ${categoryId}, ${product.vendor}, ${variant.barcode || null}, ${"shopify"}, ${feedItemId}, ${`[${embedding.join(",")}]`}::vector)`,
        );
        inserted++;
      }

      if ((i + 1) % 25 === 0 || i === products.length - 1) {
        console.log(`  Progress: ${i + 1}/${products.length} (${inserted} new, ${updated} updated, ${errors} errors)`);
      }
    } catch (err) {
      errors++;
      if (errors <= 3) console.error(`  Error on product "${product.title}":`, err);
    }
  }

  const totalCount = await db.execute(
    sql`SELECT count(*) as c FROM product_listings WHERE brand_id = ${brandRow.id}`,
  );

  console.log(`\nDone. ${inserted} inserted, ${updated} updated, ${errors} errors.`);
  console.log(`Total products for ${brandRow.name}: ${(totalCount.rows[0] as any).c}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
