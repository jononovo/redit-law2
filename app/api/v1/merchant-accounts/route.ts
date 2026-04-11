import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { insertBrandLoginAccountSchema } from "@/shared/schema";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const accounts = await storage.getBrandLoginAccountsByOwner(user.uid);
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("GET /api/v1/merchant-accounts error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = insertBrandLoginAccountSchema.safeParse({ ...body, ownerUid: user.uid });
    if (!parsed.success) {
      return NextResponse.json({ error: "validation_error", details: parsed.error.flatten() }, { status: 400 });
    }

    const brand = await storage.getBrandById(parsed.data.brandId);
    if (!brand) {
      return NextResponse.json({ error: "brand_not_found" }, { status: 404 });
    }

    const account = await storage.createBrandLoginAccount(parsed.data);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/merchant-accounts error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
