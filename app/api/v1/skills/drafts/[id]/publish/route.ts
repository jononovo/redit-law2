import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { prepareVersionData } from "@/lib/procurement-skills/versioning";
import type { VendorSkill } from "@/lib/procurement-skills/types";
import type { SourceType } from "@/lib/procurement-skills/versioning";

export async function POST(
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

    if (draft.status === "published") {
      return NextResponse.json({ error: "already_published", message: "This draft is already published" }, { status: 400 });
    }

    const vendorData = draft.vendorData as Record<string, unknown>;

    const requiredFields = ["slug", "name", "category", "url", "checkoutMethods", "capabilities"];
    const missing = requiredFields.filter(f => !vendorData[f]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "incomplete_draft", message: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const vendor = vendorData as unknown as VendorSkill;
    const vendorSlug = vendor.slug || draft.vendorSlug || "";

    const existingVersion = await storage.getActiveVersion(vendorSlug);

    const sourceType: SourceType = draft.submissionSource === "community" ? "community" : "draft";
    const changeType = existingVersion ? (sourceType === "community" ? "community_update" : "edit") : "initial";

    const versionData = prepareVersionData({
      vendorSlug,
      vendorData: vendor,
      changeType: changeType as any,
      changeSummary: existingVersion
        ? `Published from draft #${draftId}`
        : `Initial publish from draft #${draftId}`,
      publishedBy: user.uid,
      sourceType,
      sourceDraftId: draftId,
      previousVersion: existingVersion
        ? {
            id: existingVersion.id,
            version: existingVersion.version,
            vendorData: existingVersion.vendorData as unknown as VendorSkill,
          }
        : undefined,
    });

    await storage.deactivateVersions(vendorSlug);
    const newVersion = await storage.createSkillVersion(versionData);

    const updated = await storage.updateSkillDraft(draftId, { status: "published" });

    if (draft.submitterUid && draft.submissionSource === "community") {
      await storage.incrementSubmitterStat(draft.submitterUid, "skillsPublished");
    }

    return NextResponse.json({
      id: updated!.id,
      status: "published",
      vendorSlug: updated!.vendorSlug,
      skillMd: versionData.skillMd,
      version: newVersion.version,
      versionId: newVersion.id,
      submitterType: draft.submitterType,
      submitterName: draft.submitterName,
      message: "Draft published successfully with version tracking.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "publish_failed", message }, { status: 500 });
  }
}
