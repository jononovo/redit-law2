import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const recentCount = await storage.getRecentPairingCodeCount(user.uid);
    if (recentCount >= 5) {
      return NextResponse.json(
        { error: "Too many pairing codes generated. Try again later." },
        { status: 429 }
      );
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    let attempts = 0;
    while (attempts < 3) {
      const code = generatePairingCode();
      try {
        const pairingCode = await storage.createPairingCode({
          code,
          ownerUid: user.uid,
          expiresAt,
        });
        return NextResponse.json({
          code: pairingCode.code,
          expires_at: pairingCode.expiresAt.toISOString(),
        }, { status: 201 });
      } catch (err: any) {
        if (err?.code === "23505" || err?.message?.includes("unique")) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json(
      { error: "Failed to generate unique code. Please try again." },
      { status: 500 }
    );
  } catch (error) {
    console.error("Pairing code creation failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
