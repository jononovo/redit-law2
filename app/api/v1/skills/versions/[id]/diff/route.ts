import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { computeVersionDiff } from "@/lib/procurement-skills/versioning";
import type { VendorSkill } from "@/lib/procurement-skills/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const versionId = parseInt(id, 10);
    const compareId = req.nextUrl.searchParams.get("compare");

    if (isNaN(versionId)) {
      return NextResponse.json({ error: "invalid_id", message: "Version ID must be a number" }, { status: 400 });
    }

    const version = await storage.getSkillVersion(versionId);
    if (!version) {
      return NextResponse.json({ error: "not_found", message: `Version ${versionId} not found` }, { status: 404 });
    }

    let compareVersion;
    if (compareId) {
      const cId = parseInt(compareId, 10);
      if (isNaN(cId)) {
        return NextResponse.json({ error: "invalid_compare_id", message: "Compare ID must be a number" }, { status: 400 });
      }
      compareVersion = await storage.getSkillVersion(cId);
    } else if (version.previousVersionId) {
      compareVersion = await storage.getSkillVersion(version.previousVersionId);
    }

    if (!compareVersion) {
      return NextResponse.json({
        error: "no_comparison",
        message: "No previous version to compare against. Provide ?compare=<id>.",
      }, { status: 400 });
    }

    const diff = computeVersionDiff(
      compareVersion.vendorData as unknown as VendorSkill,
      version.vendorData as unknown as VendorSkill,
      compareVersion.version,
      version.version,
    );

    return NextResponse.json({
      from: { id: compareVersion.id, version: compareVersion.version },
      to: { id: version.id, version: version.version },
      diff,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "diff_failed", message }, { status: 500 });
  }
}
