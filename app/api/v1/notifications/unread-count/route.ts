import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const count = await storage.getUnreadCount(user.uid);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Get unread count error:", error);
    return NextResponse.json({ error: "Failed to get unread count" }, { status: 500 });
  }
}
