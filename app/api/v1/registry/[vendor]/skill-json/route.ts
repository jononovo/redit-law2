import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { buildSkillJson } from "@/lib/procurement-skills/skill-json";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vendor: string }> },
) {
  const { vendor: slug } = await params;

  if (!slug || slug.length < 2) {
    return NextResponse.json(
      { error: "invalid_vendor", message: "A valid vendor slug is required" },
      { status: 400 },
    );
  }

  try {
    const brand = await storage.getBrandBySlug(slug);

    if (!brand) {
      return NextResponse.json(
        { error: "not_found", message: `Skill '${slug}' not found in the registry` },
        { status: 404 },
      );
    }

    let categoryObjects: { id: number; name: string; path: string; depth: number; primary: boolean }[] = [];
    try {
      categoryObjects = await storage.getBrandCategoryObjects(brand.id);
    } catch {}

    const skillJson = buildSkillJson({
      ...brand,
      categoryObjects,
    } as Parameters<typeof buildSkillJson>[0]);

    return NextResponse.json(skillJson, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Registry-Version": "1.0",
      },
    });
  } catch (error) {
    console.error(`GET /api/v1/registry/${slug}/skill-json error:`, error);
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
