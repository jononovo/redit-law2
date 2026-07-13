import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";

function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const anonRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const ANON_RATE_LIMIT = 5;
const ANON_RATE_WINDOW = 60 * 60 * 1000;

function checkAnonRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = anonRateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    anonRateLimitMap.set(ip, { count: 1, resetAt: now + ANON_RATE_WINDOW });
    return true;
  }

  if (entry.count >= ANON_RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    if (user) {
      const recentCount = await storage.getRecentPairingCodeCount(user.uid);
      if (recentCount >= 5) {
        return NextResponse.json(
          { error: "Too many pairing codes generated. Try again later." },
          { status: 429 }
        );
      }
    } else {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      if (!checkAnonRateLimit(ip)) {
        return NextResponse.json(
          { error: "Too many pairing codes generated. Try again later." },
          { status: 429 }
        );
      }
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    let attempts = 0;
    while (attempts < 3) {
      const code = generatePairingCode();
      try {
        const pairingCode = await storage.createPairingCode({
          code,
          ownerUid: user?.uid ?? null,
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
