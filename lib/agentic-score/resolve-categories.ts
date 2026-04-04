import { db } from "@/server/db";
import { productCategories } from "@/shared/schema";
import { eq, lte, like, and, or } from "drizzle-orm";
import { SECTOR_ROOT_IDS, SECTOR_LABELS } from "@/lib/procurement-skills/taxonomy/sectors";
import type { VendorSector } from "@/lib/procurement-skills/taxonomy/sectors";

export interface ResolvedCategory {
  categoryId: number;
  isPrimary: boolean;
}

const PERPLEXITY_TIMEOUT_MS = 20_000;
const MAX_CATEGORIES = 10;

const CATEGORY_SCHEMA = {
  type: "object" as const,
  properties: {
    categoryIds: {
      type: "array",
      items: { type: "number" },
      description: "IDs of matching categories from the provided list (max 10)",
    },
    primaryCategoryId: {
      type: "number",
      description: "The single most representative category ID for this brand",
    },
  },
  required: ["categoryIds", "primaryCategoryId"],
};

export async function resolveProductCategories(
  domain: string,
  sector: VendorSector,
): Promise<ResolvedCategory[]> {
  const rootId = SECTOR_ROOT_IDS[sector];
  if (rootId === undefined) return [];

  const rootName = SECTOR_LABELS[sector];
  if (!rootName) return [];

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return [];

  const subtree = await db
    .select({
      id: productCategories.id,
      name: productCategories.name,
      path: productCategories.path,
      depth: productCategories.depth,
    })
    .from(productCategories)
    .where(
      and(
        or(
          eq(productCategories.id, rootId),
          like(productCategories.path, `${rootName} > %`),
        ),
        lte(productCategories.depth, 3),
      ),
    );

  const selectableCategories = subtree.filter((c) => c.depth >= 2);
  if (!selectableCategories.length) return [];

  const validIds = new Set(selectableCategories.map((c) => c.id));

  const categoryMenu = selectableCategories
    .map((c) => {
      const shortPath = c.path.split(" > ").slice(1).join(" > ");
      return `${c.id} - ${shortPath}`;
    })
    .join("\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch("https://api.perplexity.ai/chat/completions", {
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
              content:
                "You are a product taxonomy classifier. Given a brand/website and a list of product categories, select which categories the brand sells in. Be accurate and comprehensive.",
            },
            {
              role: "user",
              content: `The e-commerce website ${domain} operates in the "${rootName}" sector.\n\nHere are the available subcategories (entries with ">" indicate deeper sub-categories, e.g. "Clothing > Activewear" is a child of "Clothing"):\n${categoryMenu}\n\nWhich of these subcategories does ${domain} sell products in? Prefer the most specific (deepest) categories that apply. Select all that apply (up to ${MAX_CATEGORIES}). Return the category IDs and identify which single category is most representative of their business.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "category_classification",
              schema: CATEGORY_SCHEMA,
            },
          },
          max_tokens: 300,
          temperature: 0.1,
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      console.warn(`[categories] Perplexity call failed for ${domain}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);

    const categoryIds: number[] = Array.isArray(parsed.categoryIds)
      ? [...new Set(parsed.categoryIds.filter((id: unknown) => typeof id === "number" && validIds.has(id as number)))].slice(0, MAX_CATEGORIES)
      : [];

    if (!categoryIds.length) return [];

    const selectedSet = new Set(categoryIds);
    const primaryId =
      typeof parsed.primaryCategoryId === "number" && selectedSet.has(parsed.primaryCategoryId)
        ? parsed.primaryCategoryId
        : categoryIds[0];

    return categoryIds.map((id) => ({
      categoryId: id,
      isPrimary: id === primaryId,
    }));
  } catch (err) {
    console.warn(`[categories] Resolution failed for ${domain}:`, err instanceof Error ? err.message : err);
    return [];
  }
}
