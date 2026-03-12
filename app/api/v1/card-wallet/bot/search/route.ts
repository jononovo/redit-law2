import { NextRequest, NextResponse } from "next/server";
import { authenticateBot } from "@/lib/agent-management/auth";
import { crossmintProductSearchSchema } from "@/shared/schema";
import { searchShopifyProduct } from "@/lib/procurement/crossmint-worldstore/shopify-search";

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = crossmintProductSearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await searchShopifyProduct(parsed.data.product_url);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const typed = error as Error & { code: string; httpStatus: number };
      return NextResponse.json(
        { error: typed.code, message: typed.message },
        { status: typed.httpStatus },
      );
    }
    console.error("POST /api/v1/card-wallet/bot/search error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const bot = await authenticateBot(request);
  if (!bot) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401 },
    );
  }
  return handler(request);
}
