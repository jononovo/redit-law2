import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  try {
    const vendors = await storage.getAllVendors();
    return NextResponse.json({ vendors });
  } catch (error) {
    console.error("GET /api/v1/vendors error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
