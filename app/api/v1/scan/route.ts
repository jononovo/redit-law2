import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/server/storage";
import {
  normalizeDomain,
  fetchScanInputs,
  computeASXScore,
  extractMeta,
} from "@/lib/agentic-score";
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
        name: existing.name,
        score: existing.overallScore,
        label: getScoreLabel(existing.overallScore),
        cached: true,
        scannedAt: existing.lastScannedAt,
        breakdown: existing.scoreBreakdown,
        recommendations: existing.recommendations,
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

    const scoreResult = computeASXScore(input);
    const meta = extractMeta(input.homepageHtml, domain);
    const slug = domain.replace(/\./g, "-").replace(/[^a-z0-9-]/g, "");
    const now = new Date();

    const brandData: Record<string, unknown> = {};
    if (existing) {
      await storage.upsertBrandIndex({
        slug: existing.slug,
        name: existing.name,
        domain,
        url: existing.url,
        description: existing.description,
        sector: existing.sector,
        submittedBy: existing.submittedBy,
        submitterType: existing.submitterType,
        brandData: existing.brandData,
        overallScore: scoreResult.overallScore,
        scoreBreakdown: scoreResult.breakdown,
        recommendations: scoreResult.recommendations,
        scanTier: "free",
        lastScannedAt: now,
        lastScannedBy: "public",
      });
    } else {
      await storage.upsertBrandIndex({
        slug,
        name: meta.name,
        domain,
        url: `https://${domain}`,
        description: meta.description,
        sector: "uncategorized",
        submittedBy: "asx-scanner",
        submitterType: "auto_scan",
        maturity: "draft",
        overallScore: scoreResult.overallScore,
        scoreBreakdown: scoreResult.breakdown,
        recommendations: scoreResult.recommendations,
        scanTier: "free",
        lastScannedAt: now,
        lastScannedBy: "public",
        brandData,
      });
    }

    return NextResponse.json({
      domain,
      name: existing?.name ?? meta.name,
      score: scoreResult.overallScore,
      label: scoreResult.label,
      cached: false,
      scannedAt: now.toISOString(),
      breakdown: scoreResult.breakdown,
      recommendations: scoreResult.recommendations,
    });
  } catch (error) {
    console.error("POST /api/v1/scan error:", error);
    return NextResponse.json(
      { error: "scan_failed", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
