import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const page = await storage.getCheckoutPageById(id);
    if (!page || page.status !== "active") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (page.pageType !== "event") {
      return NextResponse.json({ error: "Not an event page" }, { status: 400 });
    }

    const [count, names] = await Promise.all([
      storage.getBuyerCountForCheckoutPage(id),
      storage.getBuyerNamesForCheckoutPage(id),
    ]);

    return NextResponse.json({
      buyer_count: count,
      buyer_names: names,
    });
  } catch (error) {
    console.error("GET /api/v1/checkout/[id]/buyers error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
