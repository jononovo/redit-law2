import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const versionId = parseInt(id, 10);
    if (isNaN(versionId)) {
      return NextResponse.json({ error: "invalid_id", message: "Version ID must be a number" }, { status: 400 });
    }

    const version = await storage.getSkillVersion(versionId);
    if (!version) {
      return NextResponse.json({ error: "not_found", message: `Version ${versionId} not found` }, { status: 404 });
    }

    return NextResponse.json({
      id: version.id,
      vendorSlug: version.vendorSlug,
      version: version.version,
      vendorData: version.vendorData,
      skillMd: version.skillMd,
      skillJson: version.skillJson,
      paymentsMd: version.paymentsMd,
      descriptionMd: version.descriptionMd,
      checksum: version.checksum,
      changeType: version.changeType,
      changeSummary: version.changeSummary,
      changedFields: version.changedFields,
      previousVersionId: version.previousVersionId,
      isActive: version.isActive,
      publishedBy: version.publishedBy,
      sourceType: version.sourceType,
      sourceDraftId: version.sourceDraftId,
      createdAt: version.createdAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "fetch_failed", message }, { status: 500 });
  }
}
