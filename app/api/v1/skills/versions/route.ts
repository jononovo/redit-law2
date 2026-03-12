import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(req: NextRequest) {
  try {
    const vendor = req.nextUrl.searchParams.get("vendor");
    if (!vendor) {
      return NextResponse.json({ error: "missing_vendor", message: "vendor query param required" }, { status: 400 });
    }

    const versions = await storage.listVersionsByVendor(vendor);

    return NextResponse.json({
      vendor,
      count: versions.length,
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        changeType: v.changeType,
        changeSummary: v.changeSummary,
        changedFields: v.changedFields,
        isActive: v.isActive,
        publishedBy: v.publishedBy,
        sourceType: v.sourceType,
        createdAt: v.createdAt,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "fetch_failed", message }, { status: 500 });
  }
}
