import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vendor: string }> }
) {
  const { vendor: slug } = await params;
  const brand = await storage.getBrandBySlug(slug);

  if (!brand) {
    return NextResponse.json(
      { error: "vendor_not_found", message: `No skill found for vendor '${slug}'` },
      { status: 404 }
    );
  }

  const skillMd = brand.skillMd;
  if (!skillMd) {
    return NextResponse.json(
      { error: "skill_not_generated", message: `Skill markdown not yet generated for '${slug}'` },
      { status: 404 }
    );
  }

  return new NextResponse(skillMd, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Skill-Version": brand.version,
      "X-Skill-Maturity": brand.maturity,
    },
  });
}
