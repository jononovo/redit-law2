import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/server/storage";
import {
  normalizeDomain,
  domainToSlug,
  fetchScanInputs,
  extractMeta,
} from "@/lib/agentic-score";
import { detectAll } from "@/lib/agentic-score/detectors";
import { SCORING_RUBRIC } from "@/lib/agentic-score/rubric";
import { computeScoreFromRubric } from "@/lib/agentic-score/scoring-engine";
import { agenticScan } from "@/lib/agentic-score/agent-scan";
import { generateVendorSkill } from "@/lib/procurement-skills/generator";
import type { VendorSkill, VendorCapability } from "@/lib/procurement-skills/types";
import type { VendorSector } from "@/lib/procurement-skills/taxonomy/sectors";
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

function mergeArrayField(
  existing: string[] | null | undefined,
  incoming: string[] | undefined,
): string[] {
  const base = existing ?? [];
  if (!incoming || incoming.length === 0) return base;
  return [...new Set([...base, ...incoming])];
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

const VALID_SECTORS: VendorSector[] = [
  "retail", "office", "fashion", "health", "beauty", "saas", "home",
  "construction", "automotive", "electronics", "food", "sports",
  "industrial", "specialty", "luxury", "travel", "entertainment",
  "education", "pets", "garden",
];

const VALID_CAPABILITIES: VendorCapability[] = [
  "price_lookup", "stock_check", "programmatic_checkout", "business_invoicing",
  "bulk_pricing", "tax_exemption", "account_creation", "order_tracking", "returns", "po_numbers",
];

function toValidSector(s: string): VendorSector {
  return VALID_SECTORS.includes(s as VendorSector) ? (s as VendorSector) : "specialty";
}

function toValidCapabilities(caps: unknown): VendorCapability[] {
  if (!Array.isArray(caps)) return [];
  return caps.filter((c): c is VendorCapability =>
    typeof c === "string" && VALID_CAPABILITIES.includes(c as VendorCapability)
  );
}

function buildVendorSkillDraft(
  slug: string,
  domain: string,
  name: string,
  sector: string,
  findings: Record<string, unknown>,
): VendorSkill {
  return {
    slug,
    name,
    url: `https://${domain}`,
    sector: toValidSector(sector),
    checkoutMethods: ["browser_automation"],
    capabilities: toValidCapabilities(findings.capabilities),
    maturity: "draft",
    methodConfig: {
      browser_automation: {
        requiresAuth: !(findings.guestCheckout ?? false),
        notes: findings.guestCheckout
          ? "Guest checkout available"
          : "Account may be required",
      },
    },
    search: {
      pattern: (findings.searchPattern as string) ?? `Search on ${name}`,
      urlTemplate: findings.searchUrlTemplate as string | undefined,
      productIdFormat: findings.productIdFormat as string | undefined,
    },
    checkout: {
      guestCheckout: (findings.guestCheckout as boolean) ?? false,
      taxExemptField: (findings.taxExemptField as boolean) ?? false,
      poNumberField: (findings.poNumberField as boolean) ?? false,
    },
    shipping: {
      freeThreshold: (findings.freeShippingThreshold as number | undefined) ?? undefined,
      estimatedDays: (findings.estimatedDeliveryDays as string) ?? "Varies",
      businessShipping: (findings.businessShipping as boolean) ?? false,
    },
    tips: Array.isArray(findings.tips) ? findings.tips as string[] : [
      `Visit https://${domain} to browse products`,
      "Use the site search to find specific items",
    ],
    version: "1.0.0",
    lastVerified: new Date().toISOString().split("T")[0],
    generatedBy: "agentic_scanner",
  };
}

function mergeEvidence(detectorEvidence: EvidenceMap, agentEvidence: EvidenceMap): EvidenceMap {
  const merged = { ...detectorEvidence };
  for (const [key, value] of Object.entries(agentEvidence)) {
    if (value === null || value === undefined) continue;
    const existing = merged[key];
    if (existing === null || existing === undefined || existing === false) {
      merged[key] = value;
    } else if (typeof value === "boolean" && value === true) {
      merged[key] = true;
    }
  }
  return merged;
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

    const detectorEvidence = detectAll(
      input.homepageHtml || "",
      input.sitemapContent ?? null,
      input.robotsTxtContent ?? null,
      input.pageLoadTimeMs ?? null,
    );

    const meta = extractMeta(input.homepageHtml, domain);
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

    const resolvedName = existing?.name ?? (agentFindings.name as string | undefined) ?? meta.name;

    const resolvedSector = existing?.sector && existing.sector !== "uncategorized"
      ? existing.sector
      : (agentFindings.sector as string | undefined) ?? "uncategorized";

    const resolvedSubSectors = existing?.subSectors && existing.subSectors.length > 0
      ? existing.subSectors
      : Array.isArray(agentFindings.subSectors) ? agentFindings.subSectors as string[] : [];

    const resolvedTier = existing?.tier ?? (agentFindings.tier as string | undefined) ?? null;

    let skillMd: string | null = null;
    let draft: VendorSkill | null = null;
    try {
      draft = buildVendorSkillDraft(slug, domain, resolvedName, resolvedSector, agentFindings);
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
      description: existing?.description ?? meta.description,
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
        draft?.capabilities?.map(c => c as string) ?? agentFindings.capabilities as string[] | undefined,
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
