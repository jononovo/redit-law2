import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scope: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { scope } = await params;
    const validScopes = ["master", "rail1", "rail2", "rail4", "rail5"];
    if (!validScopes.includes(scope)) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    const control = await storage.getProcurementControlsByScope(session.uid, scope, null);
    return NextResponse.json({ control: control || null });
  } catch (error: any) {
    console.error("GET /api/v1/procurement-controls/[scope] error:", error?.message || error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
