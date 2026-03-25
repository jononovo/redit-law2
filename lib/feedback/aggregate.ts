import { db } from "@/server/db";
import { brandFeedback, brandIndex } from "@/shared/schema";
import { eq, gte, sql } from "drizzle-orm";

interface AggregatedRating {
  searchAccuracy: number;
  stockReliability: number;
  checkoutCompletion: number;
  overall: number;
  count: number;
}

function computeRecencyWeight(createdAt: Date): number {
  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return 1.0;
  if (ageDays <= 30) return 0.8;
  if (ageDays <= 60) return 0.6;
  return 0.4;
}

function getSourceWeight(source: string, authenticated: boolean): number {
  if (source === "human") return 2.0;
  if (authenticated) return 1.0;
  return 0.5;
}

export async function aggregateBrandRatings(targetSlug?: string): Promise<{ updated: number; skipped: number }> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const slugs: string[] = [];
  if (targetSlug) {
    slugs.push(targetSlug);
  } else {
    const feedbackSlugs = await db.selectDistinct({ slug: brandFeedback.brandSlug })
      .from(brandFeedback);
    const ratedSlugs = await db.select({ slug: brandIndex.slug })
      .from(brandIndex)
      .where(sql`${brandIndex.ratingOverall} IS NOT NULL`);
    const allSlugs = new Set([
      ...feedbackSlugs.map(r => r.slug),
      ...ratedSlugs.map(r => r.slug),
    ]);
    slugs.push(...allSlugs);
  }

  let updated = 0;
  let skipped = 0;

  for (const slug of slugs) {
    const feedbackRows = await db.select()
      .from(brandFeedback)
      .where(eq(brandFeedback.brandSlug, slug));

    const recentRows = feedbackRows.filter(r => r.createdAt >= cutoff);

    let totalWeight = 0;
    let weightedSearch = 0;
    let weightedStock = 0;
    let weightedCheckout = 0;

    for (const row of recentRows) {
      const recency = computeRecencyWeight(row.createdAt);
      const sourceW = getSourceWeight(row.source, row.authenticated);
      const w = recency * sourceW;

      totalWeight += w;
      weightedSearch += row.searchAccuracy * w;
      weightedStock += row.stockReliability * w;
      weightedCheckout += row.checkoutCompletion * w;
    }

    if (totalWeight < 5) {
      await db.update(brandIndex)
        .set({
          ratingSearchAccuracy: null,
          ratingStockReliability: null,
          ratingCheckoutCompletion: null,
          ratingOverall: null,
          ratingCount: recentRows.length,
          updatedAt: new Date(),
        })
        .where(eq(brandIndex.slug, slug));
      skipped++;
      continue;
    }

    const avgSearch = weightedSearch / totalWeight;
    const avgStock = weightedStock / totalWeight;
    const avgCheckout = weightedCheckout / totalWeight;
    const avgOverall = (avgSearch + avgStock + avgCheckout) / 3;

    await db.update(brandIndex)
      .set({
        ratingSearchAccuracy: avgSearch.toFixed(2),
        ratingStockReliability: avgStock.toFixed(2),
        ratingCheckoutCompletion: avgCheckout.toFixed(2),
        ratingOverall: avgOverall.toFixed(2),
        ratingCount: recentRows.length,
        updatedAt: new Date(),
      })
      .where(eq(brandIndex.slug, slug));
    updated++;
  }

  return { updated, skipped };
}
