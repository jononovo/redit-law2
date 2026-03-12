import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { insertShippingAddressSchema } from "@/shared/schema";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const addresses = await storage.getShippingAddressesByOwner(user.uid);
    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("GET /api/v1/shipping-addresses error:", error);
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
    const parsed = insertShippingAddressSchema.safeParse({ ...body, ownerUid: user.uid });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const address = await storage.createShippingAddress(parsed.data);
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/shipping-addresses error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
