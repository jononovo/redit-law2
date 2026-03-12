import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie, destroySession, getCurrentUser } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";
import { storage } from "@/server/storage";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    await createSessionCookie(idToken);

    const user = await adminAuth.getUser(decodedToken.uid);

    const owner = await storage.upsertOwner(user.uid, {
      email: user.email || "",
      displayName: user.displayName || null,
    });

    return NextResponse.json({
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      flags: owner?.flags ?? [],
    });
  } catch (error: any) {
    console.error("Session creation failed:", error?.message);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ success: true });
}
