import { db } from "../server/db";
import { productCategories, categoryKeywords } from "../shared/schema";
import { sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const BATCH_SIZE = 15;
const KEYWORDS_PER_CATEGORY = 8;

const client = new Anthropic();

interface CategoryRow {
  id: number;
  name: string;
  path: string;
  depth: number;
}

async function generateKeywordsForBatch(
  categories: CategoryRow[],
): Promise<Map<number, string[]>> {
  const categoryList = categories
    .map((c) => `${c.id}: ${c.path}`)
    .join("\n");

  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `For each Google Product Category below, generate ${KEYWORDS_PER_CATEGORY} search keywords/phrases that a shopper would use to find products in that category. Include synonyms, abbreviations, and related terms. Return ONLY valid JSON — an object where keys are category IDs (as strings) and values are arrays of lowercase keyword strings. No explanation.

Categories:
${categoryList}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
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
  } catch (err) {
    console.error("  Batch error:", err);
    return new Map();
  }
}

async function main() {
  const maxDepth = parseInt(process.argv[2] || "4");
  console.log(`Generating keywords for categories up to depth ${maxDepth}`);

  const allCategories = await db
    .select({
      id: productCategories.id,
      name: productCategories.name,
      path: productCategories.path,
      depth: productCategories.depth,
    })
    .from(productCategories)
    .orderBy(productCategories.depth, productCategories.name);

  const existingIds = new Set<number>();
  const existingRows = await db
    .select({ categoryId: categoryKeywords.categoryId })
    .from(categoryKeywords);
  for (const r of existingRows) existingIds.add(r.categoryId);

  const remaining = allCategories.filter(
    (c) => !existingIds.has(c.id) && c.depth <= maxDepth,
  );
  console.log(
    `${remaining.length} categories need keywords (${existingIds.size} already done, filtering to depth <= ${maxDepth})`,
  );

  if (remaining.length === 0) {
    console.log("All categories at this depth already have keywords. Done.");
    process.exit(0);
  }

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);
    console.log(
      `\nBatch ${batchNum}/${totalBatches} (${batch.length} categories, depth ${batch[0].depth}-${batch[batch.length - 1].depth})...`,
    );

    const keywordsMap = await generateKeywordsForBatch(batch);

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
      await new Promise((r) => setTimeout(r, 300));
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
