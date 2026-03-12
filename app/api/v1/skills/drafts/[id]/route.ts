import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { updateSkillDraftSchema } from "@/shared/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const draftId = parseInt(id, 10);
    if (isNaN(draftId)) {
      return NextResponse.json({ error: "invalid_id", message: "Draft ID must be a number" }, { status: 400 });
    }

    const draft = await storage.getSkillDraft(draftId);
    if (!draft) {
      return NextResponse.json({ error: "not_found", message: `Draft ${draftId} not found` }, { status: 404 });
    }

    const evidence = await storage.getSkillEvidenceByDraftId(draftId);

    return NextResponse.json({
      id: draft.id,
      vendorUrl: draft.vendorUrl,
      vendorSlug: draft.vendorSlug,
      vendorData: draft.vendorData,
      confidence: draft.confidence,
      reviewNeeded: draft.reviewNeeded,
      status: draft.status,
      autoPublish: draft.autoPublish,
      createdBy: draft.createdBy,
      submitterUid: draft.submitterUid,
      submitterName: draft.submitterName,
      submitterType: draft.submitterType,
      submissionSource: draft.submissionSource,
      warnings: draft.warnings,
      evidence: evidence.map(e => ({
        id: e.id,
        field: e.field,
        source: e.source,
        url: e.url,
        snippet: e.snippet,
      })),
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "fetch_failed", message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const draftId = parseInt(id, 10);
    if (isNaN(draftId)) {
      return NextResponse.json({ error: "invalid_id", message: "Draft ID must be a number" }, { status: 400 });
    }

    const existing = await storage.getSkillDraft(draftId);
    if (!existing) {
      return NextResponse.json({ error: "not_found", message: `Draft ${draftId} not found` }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSkillDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: "Invalid update data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.vendorData) {
      updateData.vendorData = { ...(existing.vendorData as Record<string, unknown>), ...parsed.data.vendorData };
    }
    if (parsed.data.status) {
      updateData.status = parsed.data.status;
    }

    const updated = await storage.updateSkillDraft(draftId, updateData);

    if (parsed.data.status === "rejected" && existing.submitterUid && existing.submissionSource === "community") {
      await storage.incrementSubmitterStat(existing.submitterUid, "skillsRejected");
    }

    return NextResponse.json({
      id: updated!.id,
      vendorSlug: updated!.vendorSlug,
      status: updated!.status,
      vendorData: updated!.vendorData,
      updatedAt: updated!.updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "update_failed", message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const draftId = parseInt(id, 10);
    if (isNaN(draftId)) {
      return NextResponse.json({ error: "invalid_id", message: "Draft ID must be a number" }, { status: 400 });
    }

    const existing = await storage.getSkillDraft(draftId);
    if (!existing) {
      return NextResponse.json({ error: "not_found", message: `Draft ${draftId} not found` }, { status: 404 });
    }

    await storage.deleteSkillDraft(draftId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "delete_failed", message }, { status: 500 });
  }
}
