import { NextRequest, NextResponse } from "next/server";
import { getVendorBySlug } from "@/lib/procurement-skills/registry";
import { generateVendorSkill } from "@/lib/procurement-skills/generator";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vendor: string }> }
) {
  const { vendor: slug } = await params;
  const vendor = getVendorBySlug(slug);

  if (!vendor) {
    return NextResponse.json(
      { error: "vendor_not_found", message: `No skill found for vendor '${slug}'` },
      { status: 404 }
    );
  }

  const skillMd = generateVendorSkill(vendor);

  return new NextResponse(skillMd, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Skill-Version": vendor.version,
      "X-Skill-Maturity": vendor.maturity,
    },
  });
}
