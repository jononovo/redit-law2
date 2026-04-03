import { storage } from "@/server/storage";
import { db } from "@/server/db";
import { scanQueue } from "@/shared/schema";
import { eq, asc, and, sql } from "drizzle-orm";
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

    const [classification, audit] = await Promise.all([
      classifyBrand(domain).catch(() => null),
      auditSite(domain).catch(() => null),
    ]);

    const evidence = audit ? auditToEvidence(audit) : {};
    const scoreResult = computeScoreFromRubric(SCORING_RUBRIC, evidence);

    const existing = await storage.getBrandByDomain(domain);

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
      // non-critical
    }

    const now = new Date();

    await storage.upsertBrandIndex({
      slug: existing?.slug ?? slug,
      name: resolvedName,
      domain,
      url: existing?.url ?? `https://${domain}`,
      description: resolvedDescription,
      sector: resolvedSector,
      subSectors: resolvedSubSectors,
      tier: resolvedTier,
      submittedBy: existing?.submittedBy ?? "scan-queue",
      submitterType: existing?.submitterType ?? "auto_scan",
      maturity: existing?.maturity ?? "draft",
      brandData: draft ?? existing?.brandData ?? {},
      overallScore: scoreResult.overallScore,
      scoreBreakdown: scoreResult.breakdown,
      recommendations: scoreResult.recommendations,
      scanTier: audit ? "perplexity" : "free",
      lastScannedAt: now,
      lastScannedBy: "scan-queue",
      skillMd: skillMd ?? existing?.skillMd ?? undefined,
      checkoutMethods: draft?.checkoutMethods ?? existing?.checkoutMethods ?? [],
      capabilities: resolvedCapabilities,
      hasApi: audit?.hasApi ?? existing?.hasApi ?? false,
      hasMcp: audit?.hasMcp ?? existing?.hasMcp ?? false,
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
