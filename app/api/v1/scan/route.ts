import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/server/storage";
import { normalizeDomain, domainToSlug } from "@/lib/agentic-score";
import { SCORING_RUBRIC } from "@/lib/agentic-score/rubric";
import { computeScoreFromRubric } from "@/lib/agentic-score/scoring-engine";
import { auditSite, auditToEvidence } from "@/lib/agentic-score/audit-site";
import { classifyBrand } from "@/lib/agentic-score/classify-brand";
import {
  buildVendorSkillDraft,
  mergeArrayField,
  domainToLabel,
} from "@/lib/agentic-score/scan-utils";
import { generateVendorSkill } from "@/lib/procurement-skills/generator";
import type { VendorSkill } from "@/lib/procurement-skills/types";
import { resolveProductCategories } from "@/lib/agentic-score/resolve-categories";
import type { VendorSector } from "@/lib/procurement-skills/taxonomy/sectors";
import type { BrandType } from "@/lib/procurement-skills/taxonomy/brand-types";
import type { ScoreLabel } from "@/lib/agentic-score";

const CACHE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

const rateLimitMap = new Map<string, number[]>();

const scanBodySchema = z.object({
  domain: z.string().min(3),
});

const SCORE_LABELS: [number, ScoreLabel][] = [
  [20, "Poor"],
  [40, "Needs Work"],
  [60, "Fair"],
  [80, "Good"],
];

function getScoreLabel(score: number): ScoreLabel {
  for (const [threshold, label] of SCORE_LABELS) {
    if (score <= threshold) return label;
  }
  return "Excellent";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = scanBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_domain", message: "A valid domain is required (min 3 characters)" },
      { status: 400 }
    );
  }

  let domain: string;
  try {
    domain = normalizeDomain(parsed.data.domain);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid domain";
    return NextResponse.json(
      { error: "invalid_domain", message },
      { status: 400 }
    );
  }

  try {
    const existing = await storage.getBrandByDomain(domain);
    if (
      existing &&
      existing.lastScannedAt &&
      existing.overallScore !== null &&
      Date.now() - new Date(existing.lastScannedAt).getTime() < CACHE_WINDOW_MS
    ) {
      return NextResponse.json({
        domain,
        slug: existing.slug,
        name: existing.name,
        score: existing.overallScore,
        label: getScoreLabel(existing.overallScore),
        cached: true,
        scannedAt: existing.lastScannedAt,
        breakdown: existing.scoreBreakdown,
        recommendations: existing.recommendations,
        skillMdUrl: existing.skillMd ? `/brands/${existing.slug}/skill` : null,
        skillJsonUrl: `/brands/${existing.slug}/skill-json`,
      });
    }

    const [classification, audit] = await Promise.all([
      classifyBrand(domain).catch(() => null),
      auditSite(domain).catch(() => null),
    ]);

    const slug = existing?.slug ?? domainToSlug(domain);

    const evidence = audit ? auditToEvidence(audit) : {};
    const scoreResult = computeScoreFromRubric(SCORING_RUBRIC, evidence);

    const resolvedName = classification?.name
      ?? existing?.name
      ?? domainToLabel(domain);

    const resolvedSector = classification?.sector
      ?? (existing?.sector && existing.sector !== "uncategorized" && existing.sector !== "retail" ? existing.sector : null)
      ?? "specialty";

    const resolvedSubSectors = classification?.subCategories
      ?? (existing?.subSectors && existing.subSectors.length > 0 ? existing.subSectors : []);

    const resolvedTier = classification?.tier
      ?? existing?.tier
      ?? null;

    const resolvedBrandType: BrandType = classification?.brandType
      ?? (existing?.brandType as BrandType | null)
      ?? "brand";

    const resolvedSectors: VendorSector[] = (classification?.sectors as VendorSector[] | undefined)
      ?? [resolvedSector as VendorSector];

    const resolvedDescription = classification?.description
      ?? existing?.description
      ?? `${resolvedName} at ${domain}`;

    const resolvedCapabilities = mergeArrayField(
      existing?.capabilities,
      classification?.capabilities?.map(c => c as string),
    );

    let skillMd: string | null = null;
    let draft: VendorSkill | null = null;
    try {
      draft = buildVendorSkillDraft(
        slug, domain, resolvedName, resolvedSector,
        audit, classification?.capabilities ?? [],
      );
      draft.asxScore = scoreResult.overallScore;
      skillMd = generateVendorSkill(draft);
    } catch {
      // SKILL.md generation failed; non-critical
    }

    const now = new Date();

    let finalSector: string = resolvedSector;

    let categoryResult: { categories: import("@/lib/agentic-score/resolve-categories").ResolvedCategory[]; resolvedSector: VendorSector } | null = null;
    try {
      categoryResult = await resolveProductCategories(
        domain,
        resolvedSector as VendorSector,
        resolvedBrandType,
        resolvedSectors,
      );
      if (categoryResult.resolvedSector) {
        finalSector = categoryResult.resolvedSector;
      }
    } catch (catErr) {
      console.warn("[scan] category resolution failed (non-critical):", catErr instanceof Error ? catErr.message : catErr);
    }

    const upserted = await storage.upsertBrandIndex({
      slug,
      name: resolvedName,
      domain,
      url: existing?.url ?? `https://${domain}`,
      description: resolvedDescription,
      sector: finalSector,
      subSectors: resolvedSubSectors,
      tier: resolvedTier,
      brandType: resolvedBrandType,
      submittedBy: existing?.submittedBy ?? "asx-scanner",
      submitterType: existing?.submitterType ?? "auto_scan",
      maturity: existing?.maturity ?? "draft",
      brandData: draft ?? existing?.brandData ?? {},
      overallScore: scoreResult.overallScore,
      scoreBreakdown: scoreResult.breakdown,
      recommendations: scoreResult.recommendations,
      scanTier: audit ? "perplexity" : "free",
      lastScannedAt: now,
      lastScannedBy: "public",
      skillMd: skillMd ?? existing?.skillMd ?? undefined,
      checkoutMethods: draft?.checkoutMethods ?? existing?.checkoutMethods ?? [],
      capabilities: resolvedCapabilities,
      hasApi: audit?.hasApi ?? existing?.hasApi ?? false,
      hasMcp: audit?.hasMcp ?? existing?.hasMcp ?? false,
    });

    if (categoryResult?.categories.length) {
      try {
        await storage.setBrandCategories(upserted.id, categoryResult.categories);
      } catch (catErr) {
        console.warn("[scan] setBrandCategories failed (non-critical):", catErr instanceof Error ? catErr.message : catErr);
      }
    }

    return NextResponse.json({
      domain,
      slug,
      name: resolvedName,
      score: scoreResult.overallScore,
      label: scoreResult.label,
      cached: false,
      scannedAt: now.toISOString(),
      breakdown: scoreResult.breakdown,
      recommendations: scoreResult.recommendations,
      skillMdUrl: skillMd ? `/brands/${slug}/skill` : null,
      skillJsonUrl: `/brands/${slug}/skill-json`,
    });
  } catch (error) {
    console.error("POST /api/v1/scan error:", error);
    return NextResponse.json(
      { error: "scan_failed", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
