import fs from "fs";
import path from "path";
import { db } from "../server/db";
import { productCategories } from "../shared/schema";
import { sql } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[&,]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface TaxonomyEntry {
  gptId: number;
  name: string;
  slug: string;
  parentGptId: number | null;
  depth: number;
  path: string;
}

function parseTaxonomyFile(filePath: string): TaxonomyEntry[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));

  const idToParent: Map<string, number | null> = new Map();
  const entries: TaxonomyEntry[] = [];

  const pathToId = new Map<string, number>();

  for (const line of lines) {
    const dashIdx = line.indexOf(" - ");
    if (dashIdx === -1) continue;

    const gptId = parseInt(line.substring(0, dashIdx).trim(), 10);
    const fullPath = line.substring(dashIdx + 3).trim();

    if (isNaN(gptId)) continue;

    const parts = fullPath.split(" > ");
    const name = parts[parts.length - 1];
    const depth = parts.length;

    let parentGptId: number | null = null;
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join(" > ");
      parentGptId = pathToId.get(parentPath) ?? null;
    }

    pathToId.set(fullPath, gptId);

    entries.push({
      gptId,
      name,
      slug: slugify(name),
      parentGptId,
      depth,
      path: fullPath,
    });
  }

  return entries;
}

async function main() {
  const taxonomyPath = path.join(process.cwd(), "data", "google-product-taxonomy.txt");

  if (!fs.existsSync(taxonomyPath)) {
    console.error(`Taxonomy file not found at ${taxonomyPath}`);
    process.exit(1);
  }

  console.log("Parsing Google Product Taxonomy...");
  const entries = parseTaxonomyFile(taxonomyPath);
  console.log(`Parsed ${entries.length} categories`);

  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(productCategories);
  const existingCount = existing[0]?.count ?? 0;

  if (existingCount > 0) {
    console.log(`Table already has ${existingCount} rows. Truncating...`);
    await db.delete(productCategories);
  }

  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    await db.insert(productCategories).values(batch);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${entries.length}`);
  }

  console.log(`Done. ${inserted} categories loaded.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
