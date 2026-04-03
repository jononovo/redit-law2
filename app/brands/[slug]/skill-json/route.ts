import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { buildSkillJson } from "@/lib/procurement-skills/skill-json";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!slug || slug.length < 2) {
    return NextResponse.json(
      { error: "invalid_slug", message: "A valid brand slug is required" },
      { status: 400 },
    );
  }

  try {
    const brand = await storage.getBrandBySlug(slug);

    if (!brand) {
      return NextResponse.json(
        { error: "not_found", message: "Brand not found" },
        { status: 404 },
      );
    }

    if (brand.overallScore === null || brand.overallScore === undefined) {
      return NextResponse.json(
        { error: "not_scanned", message: "This brand has not been scanned yet. Run a scan first." },
        { status: 404 },
      );
    }

    let categoryObjects: { gptId: number; name: string; path: string; depth: number; primary: boolean }[] = [];
    try {
      categoryObjects = await storage.getBrandCategoryObjects(brand.id);
    } catch {
    }

    const skillJson = buildSkillJson({
      ...brand,
      categoryObjects,
    } as Parameters<typeof buildSkillJson>[0]);

    return NextResponse.json(skillJson, {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("GET /brands/[slug]/skill-json error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
