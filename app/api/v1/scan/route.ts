import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/server/storage";
import { normalizeDomain, domainToSlug, fetchScanInputs } from "@/lib/agentic-score";
import { detectAll } from "@/lib/agentic-score/detectors";
import { SCORING_RUBRIC } from "@/lib/agentic-score/rubric";
import { computeScoreFromRubric } from "@/lib/agentic-score/scoring-engine";
import { agenticScan } from "@/lib/agentic-score/agent-scan";
import { classifyBrand } from "@/lib/agentic-score/classify-brand";
import {
  buildVendorSkillDraft,
  mergeEvidence,
  mergeArrayField,
  domainToLabel,
} from "@/lib/agentic-score/scan-utils";
import { generateVendorSkill } from "@/lib/procurement-skills/generator";
import type { VendorSkill } from "@/lib/procurement-skills/types";
import type { ScoreLabel } from "@/lib/agentic-score";
import type { EvidenceMap } from "@/lib/agentic-score/rubric";

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
      });
    }

    let input;
    try {
      input = await fetchScanInputs(domain);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not reach domain";
      return NextResponse.json(
        { error: "unreachable", message },
        { status: 422 }
      );
    }

    const classification = await classifyBrand(domain).catch(() => null);

    const detectorEvidence = detectAll(
      input.homepageHtml || "",
      input.sitemapContent ?? null,
      input.robotsTxtContent ?? null,
      input.pageLoadTimeMs ?? null,
    );

    const slug = existing?.slug ?? domainToSlug(domain);

    let agentResult;
    try {
      agentResult = await agenticScan(domain, input.homepageHtml);
      if (agentResult?.error) {
        console.error(`[scan] agentic scan degraded for ${domain}: ${agentResult.error}`);
      }
    } catch (err) {
      console.error(`[scan] agentic scan failed for ${domain}:`, err instanceof Error ? err.message : err);
      agentResult = null;
    }

    const agentEvidence = agentResult?.evidence ?? {};
    const agentCitations = agentResult?.citations ?? [];
    const agentFindings = agentResult?.findings ?? {};
    const hasAgentEvidence = agentResult !== null && Object.keys(agentEvidence).length > 0;
    const enhanced = hasAgentEvidence;

    const finalEvidence = hasAgentEvidence
      ? mergeEvidence(detectorEvidence, agentEvidence)
      : detectorEvidence;

    const scoreResult = computeScoreFromRubric(SCORING_RUBRIC, finalEvidence);

    const resolvedName = classification?.name
      ?? existing?.name
      ?? domainToLabel(domain);

    const resolvedSector = classification?.sector
      ?? (existing?.sector && existing.sector !== "uncategorized" ? existing.sector : null)
      ?? "uncategorized";

    const resolvedSubSectors = classification?.subCategories
      ?? (existing?.subSectors && existing.subSectors.length > 0 ? existing.subSectors : []);

    const resolvedTier = classification?.tier
      ?? existing?.tier
      ?? null;

    const resolvedDescription = classification?.description
      ?? existing?.description
      ?? `${resolvedName} at ${domain}`;

    const enrichedFindings: Record<string, unknown> = {
      ...agentFindings,
      capabilities: classification?.capabilities ?? [],
      guestCheckout: agentFindings.guestCheckout ?? classification?.guestCheckout ?? false,
    };

    let skillMd: string | null = null;
    let draft: VendorSkill | null = null;
    try {
      draft = buildVendorSkillDraft(slug, domain, resolvedName, resolvedSector, enrichedFindings);
      skillMd = generateVendorSkill(draft);
    } catch {
      // SKILL.md generation failed; non-critical
    }

    const now = new Date();

    await storage.upsertBrandIndex({
      slug,
      name: resolvedName,
      domain,
      url: existing?.url ?? `https://${domain}`,
      description: resolvedDescription,
      sector: resolvedSector,
      subSectors: resolvedSubSectors,
      tier: resolvedTier,
      submittedBy: existing?.submittedBy ?? "asx-scanner",
      submitterType: existing?.submitterType ?? "auto_scan",
      maturity: existing?.maturity ?? "draft",
      brandData: draft ?? existing?.brandData ?? {},
      overallScore: scoreResult.overallScore,
      scoreBreakdown: scoreResult.breakdown,
      recommendations: scoreResult.recommendations,
      scanTier: enhanced ? "agentic" : "free",
      lastScannedAt: now,
      lastScannedBy: "public",
      skillMd: skillMd ?? existing?.skillMd ?? undefined,
      checkoutMethods: draft?.checkoutMethods ?? existing?.checkoutMethods ?? [],
      capabilities: mergeArrayField(
        existing?.capabilities,
        classification?.capabilities?.map(c => c as string),
      ),
      hasApi: (existing?.hasApi || (agentFindings.hasApi as boolean | undefined)) ?? false,
      hasMcp: (existing?.hasMcp || (agentFindings.hasMcp as boolean | undefined)) ?? false,
    });

    return NextResponse.json({
      domain,
      slug,
      name: resolvedName,
      score: scoreResult.overallScore,
      label: scoreResult.label,
      cached: false,
      enhanced,
      scannedAt: now.toISOString(),
      breakdown: scoreResult.breakdown,
      recommendations: scoreResult.recommendations,
      citations: agentCitations,
      skillMdUrl: skillMd ? `/brands/${slug}/skill` : null,
    });
  } catch (error) {
    console.error("POST /api/v1/scan error:", error);
    return NextResponse.json(
      { error: "scan_failed", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
