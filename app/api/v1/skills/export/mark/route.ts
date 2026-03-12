import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (body.items && Array.isArray(body.items)) {
      const destination = body.destination;
      if (!destination || !["clawhub", "skills_sh"].includes(destination)) {
        return NextResponse.json({ error: "invalid_destination" }, { status: 400 });
      }

      const exportItems = body.items.map((item: { vendorSlug: string; versionId: number }) => ({
        vendorSlug: item.vendorSlug,
        versionId: item.versionId,
        destination,
        exportedBy: user.uid,
      }));

      const exports = await storage.createSkillExportBatch(exportItems);
      return NextResponse.json({ success: true, count: exports.length, exports });
    }

    const { vendorSlug, versionId, destination } = body;
    if (!vendorSlug || !versionId || !destination) {
      return NextResponse.json({ error: "missing_fields", message: "vendorSlug, versionId, and destination are required" }, { status: 400 });
    }

    if (!["clawhub", "skills_sh"].includes(destination)) {
      return NextResponse.json({ error: "invalid_destination" }, { status: 400 });
    }

    const exp = await storage.createSkillExport({
      vendorSlug,
      versionId,
      destination,
      exportedBy: user.uid,
    });

    return NextResponse.json({ success: true, export: exp });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "mark_export_failed", message }, { status: 500 });
  }
}
