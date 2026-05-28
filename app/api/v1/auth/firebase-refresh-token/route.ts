import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { refresh_token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const refreshToken = body.refresh_token;
  if (typeof refreshToken !== "string" || refreshToken.length < 10) {
    return NextResponse.json({ error: "invalid_refresh_token" }, { status: 400 });
  }

  await storage.setFirebaseRefreshToken(user.uid, refreshToken);
  return NextResponse.json({ ok: true });
}
