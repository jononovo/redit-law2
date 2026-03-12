import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { prepareVersionData } from "@/lib/procurement-skills/versioning";
import type { VendorSkill } from "@/lib/procurement-skills/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const targetVersionId = parseInt(id, 10);
    if (isNaN(targetVersionId)) {
      return NextResponse.json({ error: "invalid_id", message: "Version ID must be a number" }, { status: 400 });
    }

    const body = await req.json();
    const reason = body?.reason || "Manual rollback";

    const targetVersion = await storage.getSkillVersion(targetVersionId);
    if (!targetVersion) {
      return NextResponse.json({ error: "not_found", message: `Version ${targetVersionId} not found` }, { status: 404 });
    }

    if (targetVersion.isActive) {
      return NextResponse.json({ error: "already_active", message: "This version is already active" }, { status: 400 });
    }

    const currentActive = await storage.getActiveVersion(targetVersion.vendorSlug);

    const versionData = prepareVersionData({
      vendorSlug: targetVersion.vendorSlug,
      vendorData: targetVersion.vendorData as unknown as VendorSkill,
      changeType: "rollback",
      changeSummary: reason,
      publishedBy: user.uid,
      sourceType: targetVersion.sourceType as any,
      previousVersion: currentActive
        ? {
            id: currentActive.id,
            version: currentActive.version,
            vendorData: currentActive.vendorData as unknown as VendorSkill,
          }
        : undefined,
    });

    await storage.deactivateVersions(targetVersion.vendorSlug);
    const newVersion = await storage.createSkillVersion(versionData);

    return NextResponse.json({
      id: newVersion.id,
      version: newVersion.version,
      vendorSlug: newVersion.vendorSlug,
      changeType: "rollback",
      changeSummary: reason,
      rolledBackTo: targetVersionId,
      message: "Rollback successful",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "rollback_failed", message }, { status: 500 });
  }
}
