import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { categoryKeywords, productCategories, brandIndex, brandCategories } from "@/shared/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { embed } from "@/lib/product-index/embeddings/embed";

interface IntakeResult {
  categories: string[];
  brand: string | null;
  tier: string | null;
  intent_type: string;
  corrected_query: string;
}

interface ResolvedCategory {
  category_id: number;
  name: string;
  path: string;
  relevance: number;
}

interface MerchantResult {
  slug: string;
  name: string;
  domain: string;
  sector: string;
  tier: string;
  asx_score: number;
  recommended: boolean;
  rank: number;
  match_depth: number;
  matched_categories: string[];
  skill_url: string;
  has_skill: boolean;
  products: ProductResult[];
}

interface RankedMerchant extends MerchantResult {
  _brand_id: number;
}

interface ProductResult {
  name: string;
  price: string;
  currency: string;
  in_stock: boolean;
  image_url: string | null;
  product_url: string;
  similarity: number;
}

const VALID_TIERS = ["ultra_luxury", "luxury", "premium", "mid_range", "value", "budget", "commodity"] as const;

const postSchema = z.object({
  category_ids: z.array(z.number().int().positive()).max(20).optional(),
  categories: z.array(z.string().min(1).max(100)).max(10).optional(),
  tier: z.enum(VALID_TIERS).optional(),
  brand: z.string().min(1).max(100).optional(),
  limit: z.number().int().min(1).max(50).optional(),
}).refine(d => d.category_ids || d.categories, {
  message: "Provide either category_ids (number[]) or categories (string[])",
});

async function runIntake(query: string): Promise<IntakeResult | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

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
            content: `Extract shopping intent from the user query. Return valid JSON only, no explanation.
Schema: { "categories": string[], "brand": string | null, "tier": "value" | "mid_range" | "premium" | "luxury" | null, "intent_type": "find" | "compare" | "alternative" | "specific_product", "corrected_query": string }
- categories: product category terms the user is looking for (e.g. "handbags", "running shoes", "laptops")
- brand: specific brand mentioned (correct typos, e.g. "guci" → "Gucci")
- tier: price tier if implied
- intent_type: what the user wants to do
- corrected_query: cleaned up version of the query`,
          },
          { role: "user", content: query },
        ],
        temperature: 0.1,
        max_tokens: 256,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) return null;

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories.slice(0, 10) : [],
      brand: parsed.brand || null,
      tier: parsed.tier && VALID_TIERS.includes(parsed.tier) ? parsed.tier : null,
      intent_type: parsed.intent_type || "find",
      corrected_query: parsed.corrected_query || query,
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function resolveCategories(terms: string[]): Promise<ResolvedCategory[]> {
  if (terms.length === 0) return [];

  const searchTerms = terms.join(" ").slice(0, 500);

  let rows = await db.execute(
    sql`SELECT ck.category_id, ck.category_name, ck.category_path,
          ts_rank(ck.keywords_tsv, websearch_to_tsquery('english', ${searchTerms}))
            * (1.0 + (4 - LEAST(pc.depth, 4)) * 0.15)
            * CASE WHEN lower(ck.category_name) = lower(${searchTerms}) THEN 3.0
                   WHEN lower(ck.category_name) LIKE '%' || lower(${searchTerms}) || '%' THEN 1.5
                   ELSE 1.0 END AS rank
        FROM category_keywords ck
        JOIN product_categories pc ON pc.id = ck.category_id
        WHERE ck.keywords_tsv @@ websearch_to_tsquery('english', ${searchTerms})
        ORDER BY rank DESC
        LIMIT 5`,
  );

  if (rows.rows.length === 0) {
    const orTerms = searchTerms.trim().split(/\s+/).map((t) => t.replace(/[^a-zA-Z0-9]/g, "")).filter(Boolean).join(" | ");
    if (orTerms) {
      rows = await db.execute(
        sql`SELECT ck.category_id, ck.category_name, ck.category_path,
              ts_rank(ck.keywords_tsv, to_tsquery('english', ${orTerms}))
                * (1.0 + (4 - LEAST(pc.depth, 4)) * 0.15)
                * CASE WHEN lower(ck.category_name) = lower(${searchTerms}) THEN 3.0
                       WHEN lower(ck.category_name) LIKE '%' || lower(${searchTerms}) || '%' THEN 1.5
                       ELSE 1.0 END AS rank
            FROM category_keywords ck
            JOIN product_categories pc ON pc.id = ck.category_id
            WHERE ck.keywords_tsv @@ to_tsquery('english', ${orTerms})
            ORDER BY rank DESC
            LIMIT 5`,
      );
    }
  }

  return (rows.rows as any[]).map((r) => ({
    category_id: r.category_id,
    name: r.category_name,
    path: r.category_path,
    relevance: parseFloat(r.rank) || 0,
  }));
}

async function rankMerchants(
  categoryIds: number[],
  tier: string | null,
  brand: string | null,
  limit: number,
): Promise<RankedMerchant[]> {
  if (categoryIds.length === 0) return [];

  const categoryArray = `{${categoryIds.join(",")}}`;
  const brandParam = brand || "";
  const tierParam = tier || "";

  const rows = await db.execute(
    sql`WITH RECURSIVE ancestors AS (
          SELECT DISTINCT id, parent_id, depth, name
          FROM product_categories WHERE id = ANY(${categoryArray}::int[])
          UNION
          SELECT pc.id, pc.parent_id, pc.depth, pc.name
          FROM product_categories pc JOIN ancestors a ON pc.id = a.parent_id
          WHERE a.depth > 0
        ),
        descendants AS (
          SELECT DISTINCT id, parent_id, depth, name
          FROM product_categories WHERE id = ANY(${categoryArray}::int[])
          UNION
          SELECT pc.id, pc.parent_id, pc.depth, pc.name
          FROM product_categories pc JOIN descendants d ON pc.parent_id = d.id
          WHERE pc.depth <= 6
        ),
        all_related AS (
          SELECT id, depth, name FROM ancestors
          UNION
          SELECT id, depth, name FROM descendants
        ),
        matched_merchants AS (
          SELECT bi.id, bi.slug, bi.name, bi.domain, bi.sector, bi.tier,
            COALESCE(bi.overall_score, 0) AS asx_score,
            bi.skill_md IS NOT NULL AS has_skill,
            MAX(ar.depth) AS match_depth,
            array_agg(DISTINCT ar.name) AS matched_categories,
            CASE WHEN ${brandParam} != '' AND (bi.slug = ${brandParam} OR bi.name ILIKE ${brandParam}) THEN 1 ELSE 0 END AS brand_match
          FROM brand_index bi
          JOIN brand_categories bc ON bc.brand_id = bi.id
          JOIN all_related ar ON ar.id = bc.category_id
          WHERE (${tierParam} = '' OR bi.tier = ${tierParam})
          AND bi.maturity IN ('verified', 'official', 'beta', 'community', 'draft')
          GROUP BY bi.id
        )
        SELECT * FROM matched_merchants
        ORDER BY brand_match DESC, match_depth DESC, asx_score DESC
        LIMIT ${limit}`,
  );

  return (rows.rows as any[]).map((r, i) => ({
    _brand_id: parseInt(r.id),
    slug: r.slug,
    name: r.name,
    domain: r.domain,
    sector: r.sector,
    tier: r.tier || "unknown",
    asx_score: parseInt(r.asx_score) || 0,
    recommended: i < 3,
    rank: i + 1,
    match_depth: parseInt(r.match_depth) || 0,
    matched_categories: r.matched_categories || [],
    skill_url: `https://brands.sh/brands/${r.slug}/skill`,
    has_skill: r.has_skill || false,
    products: [] as ProductResult[],
  }));
}

async function attachProducts(
  merchants: RankedMerchant[],
  searchText: string,
  productsPerMerchant: number = 3,
): Promise<void> {
  if (merchants.length === 0 || !searchText) return;

  const brandIds = merchants.map((m) => m._brand_id);
  const brandIdArray = `{${brandIds.join(",")}}`;

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embed(searchText);
  } catch {
    return;
  }

  const vecStr = `[${queryEmbedding.join(",")}]`;

  const rows = await db.execute(
    sql`SELECT b.brand_id, p.name, p.price_cents, p.currency, p.in_stock, p.image_url, p.product_url, p.similarity
        FROM unnest(${brandIdArray}::int[]) AS b(brand_id)
        CROSS JOIN LATERAL (
          SELECT name, price_cents, currency, in_stock, image_url, product_url,
                 1 - (embedding <=> ${vecStr}::vector) AS similarity
          FROM product_listings
          WHERE brand_id = b.brand_id AND embedding IS NOT NULL
          ORDER BY embedding <=> ${vecStr}::vector
          LIMIT ${productsPerMerchant}
        ) p
        ORDER BY b.brand_id, p.similarity DESC`,
  );

  const productsByBrand = new Map<number, ProductResult[]>();
  for (const row of rows.rows as any[]) {
    const brandId = parseInt(row.brand_id);
    const existing = productsByBrand.get(brandId) || [];
    if (existing.length >= productsPerMerchant) continue;
    existing.push({
      name: row.name,
      price: `$${(parseInt(row.price_cents) / 100).toFixed(2)}`,
      currency: row.currency,
      in_stock: row.in_stock,
      image_url: row.image_url,
      product_url: row.product_url,
      similarity: parseFloat(parseFloat(row.similarity).toFixed(3)),
    });
    productsByBrand.set(brandId, existing);
  }

  for (const merchant of merchants) {
    merchant.products = productsByBrand.get(merchant._brand_id) || [];
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "bad_request", message: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 },
      );
    }

    const { category_ids, categories, tier, brand, limit: resultLimit } = parsed.data;
    const merchantLimit = resultLimit ?? 10;
    const stagesExecuted: string[] = [];

    let resolvedCategories: ResolvedCategory[] = [];
    let resolvedCategoryIds: number[] = [];

    if (category_ids && category_ids.length > 0) {
      resolvedCategoryIds = category_ids;
      const catIdArray = `{${category_ids.join(",")}}`;
      const catRows = await db.execute(
        sql`SELECT id, name, path FROM product_categories WHERE id = ANY(${catIdArray}::int[])`,
      );
      const catMap = new Map((catRows.rows as any[]).map((r) => [r.id, r]));
      resolvedCategories = category_ids.map((id) => {
        const row = catMap.get(id);
        return {
          category_id: id,
          name: row?.name || "",
          path: row?.path || "",
          relevance: 1.0,
        };
      });
    } else if (categories && categories.length > 0) {
      stagesExecuted.push("categories");
      resolvedCategories = await resolveCategories(categories);
      resolvedCategoryIds = resolvedCategories.map((c) => c.category_id);
    }

    stagesExecuted.push("merchants");
    const merchants = await rankMerchants(resolvedCategoryIds, tier ?? null, brand ?? null, merchantLimit);

    const searchText = categories?.join(" ") || resolvedCategories.map((c) => c.name).filter(Boolean).join(" ") || brand || "";
    if (searchText && merchants.length > 0) {
      stagesExecuted.push("products");
      await attachProducts(merchants, searchText);
    }

    const queryTimeMs = Date.now() - startTime;

    const cleanMerchants = merchants.map(({ _brand_id, ...rest }) => rest);

    return NextResponse.json({
      query: categories?.join(", ") || category_ids?.join(", ") || "",
      intent: {
        categories: categories || [],
        brand: brand || null,
        tier: tier || null,
        intent_type: "find",
      },
      resolved_categories: resolvedCategories,
      merchants: cleanMerchants,
      total_merchant_matches: cleanMerchants.length,
      meta: {
        query_time_ms: queryTimeMs,
        intake_time_ms: null,
        stages_executed: stagesExecuted,
      },
    });
  } catch (error) {
    console.error("POST /api/v1/recommend error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0 || q.length > 500) {
    return NextResponse.json(
      { error: "bad_request", message: "Query parameter 'q' is required (max 500 chars)" },
      { status: 400 },
    );
  }

  const tierParam = request.nextUrl.searchParams.get("tier") as typeof VALID_TIERS[number] | null;
  const limitParam = request.nextUrl.searchParams.get("limit");
  const merchantLimit = Math.max(1, Math.min(parseInt(limitParam || "10") || 10, 50));

  if (tierParam && !VALID_TIERS.includes(tierParam)) {
    return NextResponse.json(
      { error: "bad_request", message: `Invalid tier. Valid: ${VALID_TIERS.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const stagesExecuted: string[] = ["intake"];

    const intakeStart = Date.now();
    const intake = await runIntake(q);
    const intakeTimeMs = Date.now() - intakeStart;

    if (!intake || intake.categories.length === 0) {
      return NextResponse.json({
        query: q,
        intent: intake || { categories: [], brand: null, tier: null, intent_type: "find" },
        resolved_categories: [],
        merchants: [],
        total_merchant_matches: 0,
        meta: {
          query_time_ms: Date.now() - startTime,
          intake_time_ms: intakeTimeMs,
          stages_executed: stagesExecuted,
        },
      });
    }

    stagesExecuted.push("categories");
    const resolvedCategories = await resolveCategories(intake.categories);
    const resolvedCategoryIds = resolvedCategories.map((c) => c.category_id);

    const effectiveTier = tierParam || intake.tier;
    const effectiveBrand = intake.brand;

    stagesExecuted.push("merchants");
    const merchants = await rankMerchants(
      resolvedCategoryIds,
      effectiveTier,
      effectiveBrand,
      merchantLimit,
    );

    stagesExecuted.push("products");
    await attachProducts(merchants, q);

    const queryTimeMs = Date.now() - startTime;

    const cleanMerchants = merchants.map(({ _brand_id, ...rest }) => rest);

    return NextResponse.json({
      query: q,
      intent: {
        categories: intake.categories,
        brand: intake.brand,
        tier: effectiveTier,
        intent_type: intake.intent_type,
      },
      resolved_categories: resolvedCategories,
      merchants: cleanMerchants,
      total_merchant_matches: cleanMerchants.length,
      meta: {
        query_time_ms: queryTimeMs,
        intake_time_ms: intakeTimeMs,
        stages_executed: stagesExecuted,
      },
    });
  } catch (error) {
    console.error("GET /api/v1/recommend error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
