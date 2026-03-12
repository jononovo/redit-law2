import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;

    const drafts = await storage.listSkillDrafts(status);

    return NextResponse.json({
      drafts: drafts.map(d => ({
        id: d.id,
        vendorUrl: d.vendorUrl,
        vendorSlug: d.vendorSlug,
        status: d.status,
        autoPublish: d.autoPublish,
        reviewNeeded: d.reviewNeeded,
        warnings: d.warnings,
        confidence: d.confidence,
        vendorName: (d.vendorData as Record<string, unknown>)?.name || d.vendorSlug || "Unknown",
        createdBy: d.createdBy,
        submitterName: d.submitterName,
        submitterType: d.submitterType,
        submissionSource: d.submissionSource,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      total: drafts.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "fetch_failed", message },
      { status: 500 }
    );
  }
}
