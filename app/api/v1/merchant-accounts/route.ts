import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { insertMerchantAccountSchema } from "@/shared/schema";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const accounts = await storage.getMerchantAccountsByOwner(user.uid);
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
    const parsed = insertMerchantAccountSchema.safeParse({ ...body, ownerUid: user.uid });
    if (!parsed.success) {
      return NextResponse.json({ error: "validation_error", details: parsed.error.flatten() }, { status: 400 });
    }

    const vendor = await storage.getVendorById(parsed.data.vendorId);
    if (!vendor) {
      return NextResponse.json({ error: "vendor_not_found" }, { status: 404 });
    }

    const account = await storage.createMerchantAccount(parsed.data);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/merchant-accounts error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
