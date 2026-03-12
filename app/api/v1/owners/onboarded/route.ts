import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    await storage.upsertOwner(user.uid, { onboardedAt: new Date() });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/v1/owners/onboarded error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
