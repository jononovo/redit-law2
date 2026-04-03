import { db } from "@/server/db";
import { productCategories } from "@/shared/schema";
import { or, eq, like, and, lte } from "drizzle-orm";
import { hasGoogleRoot, GOOGLE_ROOT_IDS, SECTOR_LABELS } from "@/lib/procurement-skills/taxonomy/sectors";
import type { VendorSector } from "@/lib/procurement-skills/taxonomy/sectors";

export interface ResolvedCategory {
  categoryId: number;
  gptId: number;
  isPrimary: boolean;
}

const MAX_MATCHES = 15;
const MAX_MERCHANT_DEPTH = 3;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function scoreMatch(candidateName: string, input: string): number {
  const cn = normalize(candidateName);
  const inp = normalize(input);
  if (cn === inp) return 100;
  if (cn === inp + "s" || cn + "s" === inp) return 95;
  if (cn.startsWith(inp + " ") || cn.endsWith(" " + inp)) return 80;
  if (cn.includes(inp) && inp.length >= 4) return 60;
  if (inp.includes(cn) && cn.length >= 4) return 40;
  return 0;
}

export async function resolveProductCategories(
  sector: VendorSector,
  subCategories: string[],
): Promise<ResolvedCategory[]> {
  if (!hasGoogleRoot(sector)) return [];
  if (!subCategories.length) return [];

  const rootName = SECTOR_LABELS[sector];
  if (!rootName) return [];

  const candidates = await db
    .select({
      id: productCategories.id,
      gptId: productCategories.gptId,
      name: productCategories.name,
      path: productCategories.path,
      depth: productCategories.depth,
    })
    .from(productCategories)
    .where(
      and(
        or(
          eq(productCategories.path, rootName),
          like(productCategories.path, `${rootName} > %`),
        ),
        lte(productCategories.depth, MAX_MERCHANT_DEPTH),
      ),
    );

  if (!candidates.length) return [];

  const matched: ResolvedCategory[] = [];
  const usedCategoryIds = new Set<number>();

  for (const sub of subCategories) {
    if (matched.length >= MAX_MATCHES) break;

    let bestScore = 0;
    let bestCandidate: (typeof candidates)[0] | null = null;

    for (const c of candidates) {
      if (usedCategoryIds.has(c.id)) continue;

      const s = scoreMatch(c.name, sub);
      if (s > bestScore || (s === bestScore && bestCandidate && c.depth < bestCandidate.depth)) {
        bestScore = s;
        bestCandidate = c;
      }
    }

    if (bestCandidate && bestScore >= 40) {
      usedCategoryIds.add(bestCandidate.id);
      matched.push({
        categoryId: bestCandidate.id,
        gptId: bestCandidate.gptId,
        isPrimary: matched.length === 0,
      });
    }
  }

  return matched;
}
