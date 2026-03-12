import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { z } from "zod";

const readSchema = z.object({
  ids: z.array(z.number().int()).min(1).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = readSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request. Provide an array of notification IDs.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await storage.markNotificationsRead(parsed.data.ids, user.uid);
    return NextResponse.json({ marked: parsed.data.ids.length });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    return NextResponse.json({ error: "Failed to mark notifications read" }, { status: 500 });
  }
}
