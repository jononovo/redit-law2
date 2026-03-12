import { NextRequest, NextResponse } from "next/server";
import { analyzeVendor } from "@/lib/procurement-skills/builder/analyze";
import { storage } from "@/server/storage";
import { analyzeVendorSchema } from "@/shared/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analyzeVendorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: "A valid URL is required", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { url } = parsed.data;

    const result = await analyzeVendor(url);

    const draft = await storage.createSkillDraftWithEvidence(
      {
        vendorUrl: url,
        vendorSlug: (result.draft.slug as string) || null,
        vendorData: result.draft as Record<string, unknown>,
        confidence: result.confidence,
        reviewNeeded: result.reviewNeeded,
        status: result.autoPublish ? "published" : "pending",
        autoPublish: result.autoPublish,
        createdBy: "skill_builder",
        warnings: result.warnings,
      },
      result.evidence.map(ev => ({
        draftId: 0,
        field: ev.field,
        source: ev.source,
        url: ev.url,
        snippet: ev.snippet,
      }))
    );

    return NextResponse.json({
      id: draft.id,
      status: draft.status,
      autoPublish: draft.autoPublish,
      reviewNeeded: draft.reviewNeeded,
      warnings: draft.warnings,
      confidence: draft.confidence,
      vendor: draft.vendorData,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[skill-builder] Analysis failed:", message);
    return NextResponse.json(
      { error: "analysis_failed", message },
      { status: 500 }
    );
  }
}
