import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { embed } from "../lib/embeddings/embed";

interface XmlProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  availability: string;
  imageLink: string;
  link: string;
  brand: string;
  gtin: string;
  mpn: string;
  googleCategory: string;
  productType: string;
}

function parseXmlFeed(xml: string): XmlProduct[] {
  const products: XmlProduct[] = [];
  const items = xml.split(/<item[>\s]/);

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const get = (tag: string): string => {
      const nsTag = `g:${tag}`;
      const match =
        item.match(
          new RegExp(`<${nsTag}[^>]*><!\\[CDATA\\[([^\\]]*?)\\]\\]></${nsTag}>`),
        ) ||
        item.match(new RegExp(`<${nsTag}[^>]*>([^<]*)</${nsTag}>`)) ||
        item.match(
          new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([^\\]]*?)\\]\\]></${tag}>`),
        ) ||
        item.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
      return match?.[1]?.trim() || "";
    };

    const title = get("title");
    const price = get("price");
    if (!title || !price) continue;

    const priceMatch = price.match(/([\d.]+)\s*([A-Z]{3})?/);
    if (!priceMatch) continue;

    products.push({
      id: get("id") || `item-${i}`,
      title,
      description: get("description").slice(0, 500),
      price: priceMatch[1],
      currency: priceMatch[2] || "USD",
      availability: get("availability"),
      imageLink: get("image_link"),
      link: get("link"),
      brand: get("brand"),
      gtin: get("gtin"),
      mpn: get("mpn"),
      googleCategory: get("google_product_category"),
      productType: get("product_type"),
    });
  }

  return products;
}

async function resolveCategory(
  googleCategoryId: string,
  productType: string,
): Promise<number | null> {
  const catId = parseInt(googleCategoryId);
  if (!isNaN(catId) && catId > 0) {
    const exists = await db.execute(
      sql`SELECT id FROM product_categories WHERE id = ${catId}`,
    );
    if (exists.rows.length > 0) return catId;
  }

  if (productType) {
    const rows = await db.execute(
      sql`SELECT category_id FROM category_keywords
          WHERE keywords_tsv @@ websearch_to_tsquery('english', ${productType})
          ORDER BY ts_rank(keywords_tsv, websearch_to_tsquery('english', ${productType})) DESC
          LIMIT 1`,
    );
    if (rows.rows.length > 0) return (rows.rows[0] as any).category_id;
  }

  return null;
}

async function main() {
  const domainArg = process.argv[2];
  const feedUrl = process.argv[3];

  if (!domainArg || !feedUrl) {
    console.error(
      "Usage: npx tsx scripts/ingest-xml-feed.ts <domain> <feed_url>",
    );
    console.error(
      "Example: npx tsx scripts/ingest-xml-feed.ts nike.com https://nike.com/feed.xml",
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
    `Ingesting XML feed for ${brandRow.name} (brand_id: ${brandRow.id})`,
  );

  console.log(`Fetching feed from ${feedUrl}...`);
  const res = await fetch(feedUrl, {
    headers: { "User-Agent": "brands.sh product indexer" },
  });
  if (!res.ok) {
    console.error(`HTTP ${res.status} fetching feed`);
    process.exit(1);
  }

  const xml = await res.text();
  console.log(`Feed size: ${(xml.length / 1024).toFixed(0)} KB`);

  const products = parseXmlFeed(xml);
  console.log(`Parsed ${products.length} products`);

  if (products.length === 0) {
    console.log("No products found in feed.");
    process.exit(0);
  }

  console.log("Loading embedding model...");
  await embed("warmup");
  console.log("Model ready\n");

  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const categoryCache = new Map<string, number | null>();

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const priceCents = Math.round(parseFloat(p.price) * 100);
    if (isNaN(priceCents) || priceCents <= 0) continue;

    try {
      const cacheKey = `${p.googleCategory}|${p.productType}`;
      if (!categoryCache.has(cacheKey)) {
        categoryCache.set(
          cacheKey,
          await resolveCategory(p.googleCategory, p.productType),
        );
      }
      const categoryId = categoryCache.get(cacheKey) ?? null;

      const embedText =
        `${p.title} ${p.brand} ${p.productType} ${p.description}`.slice(0, 512);
      const embedding = await embed(embedText);

      const existing = await db.execute(
        sql`SELECT id FROM product_listings WHERE brand_id = ${brandRow.id} AND feed_item_id = ${p.id}`,
      );

      if (existing.rows.length > 0) {
        await db.execute(
          sql`UPDATE product_listings SET
            name = ${p.title},
            description = ${p.description || null},
            price_cents = ${priceCents},
            currency = ${p.currency},
            in_stock = ${p.availability !== "out of stock"},
            image_url = ${p.imageLink || null},
            product_url = ${p.link},
            category_id = ${categoryId},
            brand_name = ${p.brand || null},
            gtin = ${p.gtin || null},
            mpn = ${p.mpn || null},
            feed_source = ${"xml"},
            embedding = ${`[${embedding.join(",")}]`}::vector,
            last_synced = NOW()
          WHERE id = ${(existing.rows[0] as any).id}`,
        );
        updated++;
      } else {
        await db.execute(
          sql`INSERT INTO product_listings (brand_id, name, description, price_cents, currency, in_stock, image_url, product_url, category_id, brand_name, gtin, mpn, feed_source, feed_item_id, embedding)
          VALUES (${brandRow.id}, ${p.title}, ${p.description || null}, ${priceCents}, ${p.currency}, ${p.availability !== "out of stock"}, ${p.imageLink || null}, ${p.link}, ${categoryId}, ${p.brand || null}, ${p.gtin || null}, ${p.mpn || null}, ${"xml"}, ${p.id}, ${`[${embedding.join(",")}]`}::vector)`,
        );
        inserted++;
      }

      if ((i + 1) % 50 === 0 || i === products.length - 1) {
        console.log(
          `  Progress: ${i + 1}/${products.length} (${inserted} new, ${updated} updated, ${errors} errors)`,
        );
      }
    } catch (err) {
      errors++;
      if (errors <= 3) console.error(`  Error on "${p.title}":`, err);
    }
  }

  const totalCount = await db.execute(
    sql`SELECT count(*) as c FROM product_listings WHERE brand_id = ${brandRow.id}`,
  );

  console.log(
    `\nDone. ${inserted} inserted, ${updated} updated, ${errors} errors.`,
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
