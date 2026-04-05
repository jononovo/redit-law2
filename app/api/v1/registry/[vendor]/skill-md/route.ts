import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

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

    if (!brand.skillMd) {
      return NextResponse.json(
        {
          error: "not_available",
          message: "SKILL.md has not been generated for this brand yet. Run a scan first.",
        },
        { status: 404 },
      );
    }

    return new Response(brand.skillMd, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Registry-Version": "1.0",
      },
    });
  } catch (error) {
    console.error(`GET /api/v1/registry/${slug}/skill-md error:`, error);
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
