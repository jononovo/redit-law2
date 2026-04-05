import { db } from "../server/db";
import { productCategories, categoryKeywords } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

const BATCH_SIZE = 15;
const PERPLEXITY_TIMEOUT_MS = 60_000;
const KEYWORDS_PER_CATEGORY = 15;

interface CategoryRow {
  id: number;
  name: string;
  path: string;
  depth: number;
}

async function generateKeywordsForBatch(
  categories: CategoryRow[],
  apiKey: string,
): Promise<Map<number, string[]>> {
  const categoryList = categories
    .map((c) => `${c.id}: ${c.path}`)
    .join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: `You generate search keywords for product categories. For each category ID, produce ${KEYWORDS_PER_CATEGORY} keywords/phrases that a shopper or AI agent might use to search for products in that category. Include synonyms, common misspellings, abbreviations, and related terms. Return valid JSON only — an object where keys are category IDs (as strings) and values are arrays of keyword strings. No explanation.`,
          },
          {
            role: "user",
            content: `Generate search keywords for these categories:\n${categoryList}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Perplexity API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("  No JSON found in response");
      return new Map();
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string[]>;
    const result = new Map<number, string[]>();

    for (const [idStr, keywords] of Object.entries(parsed)) {
      const id = parseInt(idStr, 10);
      if (!isNaN(id) && Array.isArray(keywords) && keywords.length > 0) {
        result.set(
          id,
          keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean),
        );
      }
    }

    return result;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      console.error("  Timeout on batch");
    } else {
      console.error("  Batch error:", err);
    }
    return new Map();
  }
}

async function main() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.error("PERPLEXITY_API_KEY not set");
    process.exit(1);
  }

  console.log("Fetching all product categories...");
  const allCategories = await db
    .select({
      id: productCategories.id,
      name: productCategories.name,
      path: productCategories.path,
      depth: productCategories.depth,
    })
    .from(productCategories)
    .orderBy(productCategories.id);

  console.log(`Found ${allCategories.length} categories`);

  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categoryKeywords);
  const existingCount = existing[0]?.count ?? 0;

  if (existingCount > 0) {
    console.log(
      `category_keywords already has ${existingCount} rows. Skipping already-populated categories.`,
    );
  }

  const existingIds = new Set<number>();
  if (existingCount > 0) {
    const rows = await db
      .select({ categoryId: categoryKeywords.categoryId })
      .from(categoryKeywords);
    for (const r of rows) existingIds.add(r.categoryId);
  }

  const remaining = allCategories.filter((c) => !existingIds.has(c.id));
  console.log(
    `${remaining.length} categories need keywords (${existingIds.size} already done)`,
  );

  if (remaining.length === 0) {
    console.log("All categories already have keywords. Done.");
    process.exit(0);
  }

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);
    console.log(
      `\nBatch ${batchNum}/${totalBatches} (${batch.length} categories)...`,
    );

    const keywordsMap = await generateKeywordsForBatch(batch, apiKey);

    const inserts: {
      categoryId: number;
      categoryName: string;
      categoryPath: string;
      keywords: string[];
    }[] = [];

    for (const cat of batch) {
      const kw = keywordsMap.get(cat.id);
      if (kw && kw.length > 0) {
        inserts.push({
          categoryId: cat.id,
          categoryName: cat.name,
          categoryPath: cat.path,
          keywords: kw,
        });
      } else {
        const fallback = cat.path
          .split(" > ")
          .map((p) => p.toLowerCase().trim());
        inserts.push({
          categoryId: cat.id,
          categoryName: cat.name,
          categoryPath: cat.path,
          keywords: [...new Set([cat.name.toLowerCase(), ...fallback])],
        });
        failed++;
      }
    }

    if (inserts.length > 0) {
      await db.transaction(async (tx) => {
        await tx.insert(categoryKeywords).values(inserts).onConflictDoNothing();

        const insertedIds = inserts.map((ins) => ins.categoryId);
        const idsArray = `{${insertedIds.join(",")}}`;
        await tx.execute(
          sql`UPDATE category_keywords
              SET keywords_tsv = to_tsvector('english', array_to_string(keywords, ' '))
              WHERE category_id = ANY(${idsArray}::int[])
              AND keywords_tsv IS NULL`,
        );
      });
    }

    processed += batch.length;
    console.log(
      `  Inserted ${inserts.length} rows (${processed}/${remaining.length} total, ${failed} fallbacks)`,
    );

    if (i + BATCH_SIZE < remaining.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const finalCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categoryKeywords);
  console.log(
    `\nDone. ${finalCount[0]?.count ?? 0} total rows in category_keywords (${failed} used fallback keywords).`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
