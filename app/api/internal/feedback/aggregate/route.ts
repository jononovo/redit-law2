import { NextRequest, NextResponse } from "next/server";
import { aggregateBrandRatings } from "@/lib/feedback/aggregate";

export async function POST(request: NextRequest) {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${internalSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? undefined;

  try {
    const result = await aggregateBrandRatings(slug);
    return NextResponse.json({
      success: true,
      ...result,
      target: slug ?? "all",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Aggregation failed", details: String(error) },
      { status: 500 }
    );
  }
}
