import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vendorSlug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { vendorSlug } = await params;

    const version = await storage.getActiveVersion(vendorSlug);
    if (!version) {
      return NextResponse.json({ error: "not_found", message: `No active version for vendor '${vendorSlug}'` }, { status: 404 });
    }

    return NextResponse.json({
      vendorSlug: version.vendorSlug,
      version: version.version,
      checksum: version.checksum,
      files: {
        "SKILL.md": version.skillMd,
        "skill.json": version.skillJson,
        "payments.md": version.paymentsMd,
        "description.md": version.descriptionMd,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "download_failed", message }, { status: 500 });
  }
}
