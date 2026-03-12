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
      vendorSlug: version.vendorSlug,
      version: version.version,
      files: {
        "SKILL.md": version.skillMd,
        "skill.json": version.skillJson,
        "payments.md": version.paymentsMd,
        "description.md": version.descriptionMd,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "fetch_failed", message }, { status: 500 });
  }
}
