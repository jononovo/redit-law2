import { db } from "@/server/db";
import { productCategories } from "@/shared/schema";
import { eq, lte, like, and, or, inArray } from "drizzle-orm";
import { SECTOR_ROOT_IDS, SECTOR_LABELS, GOOGLE_ROOT_IDS, hasSectorRoot } from "@/lib/procurement-skills/taxonomy/sectors";
import type { VendorSector } from "@/lib/procurement-skills/taxonomy/sectors";
import type { BrandType } from "@/lib/procurement-skills/taxonomy/brand-types";
import { MULTI_SECTOR_TYPES } from "@/lib/procurement-skills/taxonomy/brand-types";

export interface ResolvedCategory {
  categoryId: number;
  isPrimary: boolean;
}

const PERPLEXITY_TIMEOUT_MS = 25_000;
const MAX_CATEGORIES_FOCUSED = 10;
const MAX_CATEGORIES_MULTI = 20;

const CATEGORY_SCHEMA = {
  type: "object" as const,
  properties: {
    categoryIds: {
      type: "array",
      items: { type: "number" },
      description: "IDs of matching categories from the provided list",
    },
    primaryCategoryId: {
      type: "number",
      description: "The single most representative category ID for this brand",
    },
  },
  required: ["categoryIds", "primaryCategoryId"],
};

interface DepthConfig {
  maxDepth: number;
  minSelectable: number;
  maxCategories: number;
  sectorOverride: VendorSector | null;
  querySectors: "primary" | "all";
}

function getDepthConfig(brandType: BrandType, sectors: VendorSector[]): DepthConfig {
  if (brandType === "mega_merchant") {
    return { maxDepth: 1, minSelectable: 1, maxCategories: MAX_CATEGORIES_MULTI, sectorOverride: "multi-sector", querySectors: "all" };
  }
  if (MULTI_SECTOR_TYPES.includes(brandType)) {
    return { maxDepth: 2, minSelectable: 1, maxCategories: MAX_CATEGORIES_MULTI, sectorOverride: "multi-sector", querySectors: "all" };
  }
  return { maxDepth: 3, minSelectable: 2, maxCategories: MAX_CATEGORIES_FOCUSED, sectorOverride: null, querySectors: sectors.length > 1 ? "all" : "primary" };
}

async function querySubtreeForSectors(
  sectors: VendorSector[],
  maxDepth: number,
  minSelectable: number,
): Promise<{ subtree: { id: number; name: string; path: string; depth: number }[]; validIds: Set<number> }> {
  const resolvableSectors = sectors.filter((s) => hasSectorRoot(s) && s !== "multi-sector");
  if (!resolvableSectors.length) return { subtree: [], validIds: new Set() };

  const pathConditions = resolvableSectors.map((s) => {
    const rootName = SECTOR_LABELS[s];
    return or(
      eq(productCategories.id, SECTOR_ROOT_IDS[s]),
      like(productCategories.path, `${rootName} > %`),
    )!;
  });

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
        or(...pathConditions),
        lte(productCategories.depth, maxDepth),
      ),
    );

  const selectableCategories = subtree.filter((c) => c.depth >= minSelectable);
  const validIds = new Set(selectableCategories.map((c) => c.id));
  return { subtree: selectableCategories, validIds };
}

function isMultiSectorType(brandType: BrandType): boolean {
  return MULTI_SECTOR_TYPES.includes(brandType);
}

function buildMegaMerchantCategories(sectors: VendorSector[]): ResolvedCategory[] {
  const resolvable = sectors.filter((s) => hasSectorRoot(s) && s !== "multi-sector");
  if (!resolvable.length) return [];
  const first = SECTOR_ROOT_IDS[resolvable[0]];
  return resolvable.map((s) => ({
    categoryId: SECTOR_ROOT_IDS[s],
    isPrimary: SECTOR_ROOT_IDS[s] === first,
  }));
}

export async function resolveProductCategories(
  domain: string,
  sector: VendorSector,
  brandType: BrandType = "brand",
  sectors: VendorSector[] = [],
): Promise<{ categories: ResolvedCategory[]; resolvedSector: VendorSector }> {
  const effectiveSectors = sectors.length > 0 ? sectors : [sector];
  const config = getDepthConfig(brandType, effectiveSectors);
  const fallbackSector: VendorSector = isMultiSectorType(brandType) ? "multi-sector" : sector;

  if (brandType === "mega_merchant") {
    return {
      categories: buildMegaMerchantCategories(effectiveSectors),
      resolvedSector: "multi-sector",
    };
  }

  const rootId = SECTOR_ROOT_IDS[sector];
  if (rootId === undefined && !config.sectorOverride) return { categories: [], resolvedSector: fallbackSector };

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { categories: [], resolvedSector: fallbackSector };

  const queryTargetSectors = config.querySectors === "all" ? effectiveSectors : [sector];
  const { subtree, validIds } = await querySubtreeForSectors(
    queryTargetSectors,
    config.maxDepth,
    config.minSelectable,
  );

  if (!subtree.length) return { categories: [], resolvedSector: fallbackSector };

  const categoryMenu = subtree
    .map((c) => {
      const shortPath = c.path.split(" > ").slice(1).join(" > ");
      return `${c.id} - ${shortPath || c.name}`;
    })
    .join("\n");

  const sectorDescription = queryTargetSectors.length > 1
    ? `multiple sectors (${queryTargetSectors.map((s) => SECTOR_LABELS[s]).join(", ")})`
    : `the "${SECTOR_LABELS[sector]}" sector`;

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
              content: `The e-commerce website ${domain} operates in ${sectorDescription}.\n\nHere are the available subcategories (entries with ">" indicate deeper sub-categories, e.g. "Clothing > Activewear" is a child of "Clothing"):\n${categoryMenu}\n\nWhich of these subcategories does ${domain} sell products in? Prefer the most specific (deepest) categories that apply. Select all that apply (up to ${config.maxCategories}). Return the category IDs and identify which single category is most representative of their business.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "category_classification",
              schema: CATEGORY_SCHEMA,
            },
          },
          max_tokens: 400,
          temperature: 0.1,
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      console.warn(`[categories] Perplexity call failed for ${domain}: HTTP ${res.status}`);
      return { categories: [], resolvedSector: fallbackSector };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { categories: [], resolvedSector: fallbackSector };

    const parsed = JSON.parse(content);

    const categoryIds: number[] = Array.isArray(parsed.categoryIds)
      ? ([...new Set(parsed.categoryIds.filter((id: unknown) => typeof id === "number" && validIds.has(id as number)))] as number[]).slice(0, config.maxCategories)
      : [];

    if (!categoryIds.length) return { categories: [], resolvedSector: fallbackSector };

    const selectedSet = new Set(categoryIds);
    const primaryId =
      typeof parsed.primaryCategoryId === "number" && selectedSet.has(parsed.primaryCategoryId)
        ? parsed.primaryCategoryId
        : categoryIds[0];

    const resolvedSector = config.sectorOverride ?? sector;

    return {
      categories: categoryIds.map((id) => ({
        categoryId: id,
        isPrimary: id === primaryId,
      })),
      resolvedSector,
    };
  } catch (err) {
    console.warn(`[categories] Resolution failed for ${domain}:`, err instanceof Error ? err.message : err);
    return { categories: [], resolvedSector: fallbackSector };
  }
}
