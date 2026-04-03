import { storage } from "@/server/storage";
import { db } from "@/server/db";
import { scanQueue } from "@/shared/schema";
import { eq, asc, and, sql } from "drizzle-orm";
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
import type { EvidenceMap } from "@/lib/agentic-score/rubric";

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

function mergeArrayField(
  existing: string[] | null | undefined,
  incoming: string[] | undefined,
): string[] {
  const base = existing ?? [];
  if (!incoming || incoming.length === 0) return base;
  return [...new Set([...base, ...incoming])];
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

export interface ProcessResult {
  success: boolean;
  queueId: number;
  domain: string;
  slug?: string;
  score?: number;
  error?: string;
}

export async function processNextInQueue(): Promise<ProcessResult | null> {
  const STALE_THRESHOLD_MS = 30 * 60 * 1000;
  await db
    .update(scanQueue)
    .set({ status: "pending", error: "Reset: stuck in scanning", startedAt: null })
    .where(
      and(
        eq(scanQueue.status, "scanning"),
        sql`${scanQueue.startedAt} < NOW() - INTERVAL '${sql.raw(String(STALE_THRESHOLD_MS / 1000))} seconds'`
      )
    );

  const claimed = await db.execute<{
    id: number;
    domain: string;
    status: string;
    priority: number;
    error: string | null;
    result_slug: string | null;
    result_score: number | null;
    created_at: Date;
    started_at: Date | null;
    completed_at: Date | null;
  }>(sql`
    UPDATE scan_queue
    SET status = 'scanning', started_at = NOW()
    WHERE id = (
      SELECT id FROM scan_queue
      WHERE status = 'pending'
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  const entry = claimed.rows?.[0];
  if (!entry) return null;

  try {
    const domain = normalizeDomain(entry.domain);
    const slug = domainToSlug(domain);

    const input = await fetchScanInputs(domain);

    const detectorEvidence = detectAll(
      input.homepageHtml || "",
      input.sitemapContent ?? null,
      input.robotsTxtContent ?? null,
      input.pageLoadTimeMs ?? null,
    );

    const meta = extractMeta(input.homepageHtml, domain);

    let agentResult;
    try {
      agentResult = await agenticScan(domain, input.homepageHtml);
    } catch (err) {
      console.error(`[scan-queue] agentic scan failed for ${domain}:`, err instanceof Error ? err.message : err);
      agentResult = null;
    }

    const agentEvidence = agentResult?.evidence ?? {};
    const agentFindings = agentResult?.findings ?? {};
    const hasAgentEvidence = agentResult !== null && Object.keys(agentEvidence).length > 0;

    const finalEvidence = hasAgentEvidence
      ? mergeEvidence(detectorEvidence, agentEvidence)
      : detectorEvidence;

    const scoreResult = computeScoreFromRubric(SCORING_RUBRIC, finalEvidence);

    const existing = await storage.getBrandByDomain(domain);
    const resolvedName = existing?.name ?? (agentFindings.name as string | undefined) ?? meta.name;
    const resolvedSector = existing?.sector && existing.sector !== "uncategorized"
      ? existing.sector
      : (agentFindings.sector as string | undefined) ?? "uncategorized";
    const resolvedSubSectors = existing?.subSectors && existing.subSectors.length > 0
      ? existing.subSectors
      : Array.isArray(agentFindings.subSectors) ? agentFindings.subSectors as string[] : [];
    const resolvedTier = existing?.tier ?? (agentFindings.tier as string | undefined) ?? null;

    let skillMd: string | null = null;
    try {
      const draft = buildVendorSkillDraft(slug, domain, resolvedName, resolvedSector, agentFindings);
      skillMd = generateVendorSkill(draft);
    } catch {
      // non-critical
    }

    const now = new Date();

    await storage.upsertBrandIndex({
      slug: existing?.slug ?? slug,
      name: resolvedName,
      domain,
      url: existing?.url ?? `https://${domain}`,
      description: existing?.description ?? meta.description,
      sector: resolvedSector,
      subSectors: resolvedSubSectors,
      tier: resolvedTier,
      submittedBy: existing?.submittedBy ?? "scan-queue",
      submitterType: existing?.submitterType ?? "auto_scan",
      maturity: existing?.maturity ?? "draft",
      brandData: existing?.brandData ?? {},
      overallScore: scoreResult.overallScore,
      scoreBreakdown: scoreResult.breakdown,
      recommendations: scoreResult.recommendations,
      scanTier: hasAgentEvidence ? "agentic" : "free",
      lastScannedAt: now,
      lastScannedBy: "scan-queue",
      skillMd: skillMd ?? existing?.skillMd ?? undefined,
      capabilities: mergeArrayField(
        existing?.capabilities,
        agentFindings.capabilities as string[] | undefined,
      ),
      hasApi: (existing?.hasApi || (agentFindings.hasApi as boolean | undefined)) ?? false,
      hasMcp: (existing?.hasMcp || (agentFindings.hasMcp as boolean | undefined)) ?? false,
    });

    const finalSlug = existing?.slug ?? slug;

    await db
      .update(scanQueue)
      .set({
        status: "completed",
        completedAt: now,
        resultSlug: finalSlug,
        resultScore: scoreResult.overallScore,
        error: null,
      })
      .where(eq(scanQueue.id, entry.id));

    return {
      success: true,
      queueId: entry.id,
      domain,
      slug: finalSlug,
      score: scoreResult.overallScore,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[scan-queue] failed to process ${entry.domain}:`, message);

    await db
      .update(scanQueue)
      .set({
        status: "failed",
        completedAt: new Date(),
        error: message,
      })
      .where(eq(scanQueue.id, entry.id));

    return {
      success: false,
      queueId: entry.id,
      domain: entry.domain,
      error: message,
    };
  }
}

export async function getQueueStats() {
  const entries = await db
    .select()
    .from(scanQueue)
    .orderBy(asc(scanQueue.createdAt));

  const pending = entries.filter((e) => e.status === "pending").length;
  const scanning = entries.filter((e) => e.status === "scanning").length;
  const completed = entries.filter((e) => e.status === "completed").length;
  const failed = entries.filter((e) => e.status === "failed").length;

  return { entries, pending, scanning, completed, failed, total: entries.length };
}

export async function addToQueue(domains: string[]): Promise<{ added: number; skipped: string[] }> {
  const skipped: string[] = [];
  let added = 0;

  for (const raw of domains) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    let domain: string;
    try {
      domain = normalizeDomain(trimmed);
    } catch {
      skipped.push(trimmed);
      continue;
    }

    const existing = await db
      .select()
      .from(scanQueue)
      .where(and(eq(scanQueue.domain, domain), eq(scanQueue.status, "pending")))
      .limit(1);

    if (existing.length > 0) {
      skipped.push(domain);
      continue;
    }

    await db.insert(scanQueue).values({ domain, status: "pending", priority: 0 });
    added++;
  }

  return { added, skipped };
}

export async function clearCompleted(): Promise<number> {
  const result = await db
    .delete(scanQueue)
    .where(eq(scanQueue.status, "completed"));
  return result.rowCount ?? 0;
}

export async function retryFailed(): Promise<number> {
  const result = await db
    .update(scanQueue)
    .set({ status: "pending", error: null, startedAt: null, completedAt: null })
    .where(eq(scanQueue.status, "failed"));
  return result.rowCount ?? 0;
}

export async function removeEntry(id: number): Promise<boolean> {
  const result = await db
    .delete(scanQueue)
    .where(eq(scanQueue.id, id));
  return (result.rowCount ?? 0) > 0;
}
