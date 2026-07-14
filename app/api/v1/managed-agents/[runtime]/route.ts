import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { authorizeAgentCheckoutRequest } from "@/features/managed-agents/crossmint-checkout/api-errors";
import { isManagedRuntime } from "@/lib/managed-agents";

// The managed agent's settings row (default card, buyer profile) for its
// dashboard page. Provisions on first read; must never fail the page — an
// unprovisionable state degrades to the empty shape.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runtime: string }> }
) {
  const { runtime } = await params;
  if (!isManagedRuntime(runtime)) {
    return NextResponse.json({ error: "unknown_runtime" }, { status: 404 });
  }

  const auth = await authorizeAgentCheckoutRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const email = auth.user.email || (await storage.getOwnerByUid(auth.user.uid))?.email;
    if (email) await storage.ensureManagedAgent(auth.user.uid, email, runtime);
  } catch (err) {
    console.error("[ManagedAgents] provisioning failed:", err);
  }

  const agent = await storage.getManagedAgent(auth.user.uid, runtime);
  return NextResponse.json({
    runtime,
    bot_id: agent?.botId ?? null,
    default_card_id: agent?.defaultCardId ?? null,
    buyer_profile_id: agent?.buyerProfileId ?? null,
    created_at: agent?.createdAt.toISOString() ?? null,
  });
}
