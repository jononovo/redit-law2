import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const destination = req.nextUrl.searchParams.get("destination") || "clawhub";
    if (!["clawhub", "skills_sh"].includes(destination)) {
      return NextResponse.json({ error: "invalid_destination", message: "Destination must be 'clawhub' or 'skills_sh'" }, { status: 400 });
    }

    const allExports = await storage.listExportsByDestination(destination);
    const exportsByVendor: Record<string, { versionId: number; exportedAt: Date }> = {};
    for (const exp of allExports) {
      if (!exportsByVendor[exp.vendorSlug]) {
        exportsByVendor[exp.vendorSlug] = { versionId: exp.versionId, exportedAt: exp.exportedAt };
      }
    }

    const allBrands = await storage.searchBrands({
      maturities: ["verified", "official"],
      sortBy: "name",
      sortDir: "asc",
      limit: 500,
    });

    const report: Array<{
      vendorSlug: string;
      vendorName: string;
      currentVersion: string;
      lastExportedVersion: string | null;
      status: "new" | "updated" | "up_to_date";
      versionId: number;
      files: {
        skillMd: string;
        skillJson: unknown;
        paymentsMd: string | null;
        descriptionMd: string | null;
      };
    }> = [];

    for (const brand of allBrands) {
      const activeVersion = await storage.getActiveVersion(brand.slug);
      if (!activeVersion) continue;

      const lastExport = exportsByVendor[brand.slug];

      let status: "new" | "updated" | "up_to_date";
      let lastExportedVersion: string | null = null;

      if (!lastExport) {
        status = "new";
      } else if (lastExport.versionId !== activeVersion.id) {
        status = "updated";
        const exportedVersion = await storage.getSkillVersion(lastExport.versionId);
        lastExportedVersion = exportedVersion?.version || null;
      } else {
        status = "up_to_date";
        lastExportedVersion = activeVersion.version;
      }

      if (status !== "up_to_date") {
        report.push({
          vendorSlug: brand.slug,
          vendorName: brand.name,
          currentVersion: activeVersion.version,
          lastExportedVersion,
          status,
          versionId: activeVersion.id,
          files: {
            skillMd: activeVersion.skillMd,
            skillJson: activeVersion.skillJson,
            paymentsMd: activeVersion.paymentsMd,
            descriptionMd: activeVersion.descriptionMd,
          },
        });
      }
    }

    const newSkills = report.filter(r => r.status === "new");
    const updatedSkills = report.filter(r => r.status === "updated");

    return NextResponse.json({
      destination,
      newCount: newSkills.length,
      updatedCount: updatedSkills.length,
      newSkills,
      updatedSkills,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "export_report_failed", message }, { status: 500 });
  }
}
