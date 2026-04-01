import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/server/storage";
import {
  normalizeDomain,
  fetchScanInputs,
  computeASXScore,
  extractMeta,
} from "@/lib/agentic-score";

const scanRequestSchema = z.object({
  domain: z.string().min(3),
});

const CACHE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

const rateLimitMap = new Map<string, number[]>();

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

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many scans. Please wait a minute." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = scanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_domain", message: "A valid domain is required." },
        { status: 400 }
      );
    }

    let domain: string;
    try {
      domain = normalizeDomain(parsed.data.domain);
    } catch (err: any) {
      return NextResponse.json(
        { error: "invalid_domain", message: err.message ?? "Invalid domain format." },
        { status: 400 }
      );
    }

    const existing = await storage.getBrandByDomain(domain);

    if (
      existing &&
      existing.overallScore !== null &&
      existing.lastScannedAt &&
      Date.now() - existing.lastScannedAt.getTime() < CACHE_WINDOW_MS
    ) {
      return NextResponse.json({
        domain,
        name: existing.name,
        score: existing.overallScore,
        label: getLabelFromScore(existing.overallScore),
        cached: true,
        scannedAt: existing.lastScannedAt.toISOString(),
        breakdown: existing.scoreBreakdown,
        recommendations: existing.recommendations,
      });
    }

    let input;
    try {
      input = await fetchScanInputs(domain);
    } catch (err: any) {
      return NextResponse.json(
        { error: "unreachable", message: `Could not reach ${domain}: ${err.message}` },
        { status: 422 }
      );
    }

    const scoreResult = computeASXScore(input);
    const meta = extractMeta(input.homepageHtml, domain);
    const slug = domain.replace(/\./g, "-").replace(/[^a-z0-9-]/g, "");

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
      lastScannedAt: new Date(),
      lastScannedBy: "public",
      brandData: {},
    });

    return NextResponse.json({
      domain,
      name: meta.name,
      score: scoreResult.overallScore,
      label: scoreResult.label,
      cached: false,
      scannedAt: new Date().toISOString(),
      breakdown: scoreResult.breakdown,
      recommendations: scoreResult.recommendations,
    });
  } catch (error) {
    console.error("POST /api/v1/scan error:", error);
    return NextResponse.json(
      { error: "scan_failed", message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

function getLabelFromScore(score: number): string {
  if (score <= 20) return "Poor";
  if (score <= 40) return "Needs Work";
  if (score <= 60) return "Fair";
  if (score <= 80) return "Good";
  return "Excellent";
}
