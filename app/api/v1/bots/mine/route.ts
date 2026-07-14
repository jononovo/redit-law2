import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/platform-management/auth/session";
import { adminAuth } from "@/features/platform-management/firebase/admin";
import { storage } from "@/server/storage";
import { CROSSMINT_CHECKOUT_RUNTIME } from "@/lib/managed-agents";

async function getAuthUser(request: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (sessionUser) return sessionUser;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const decoded = await adminAuth.verifyIdToken(token);
      const fbUser = await adminAuth.getUser(decoded.uid);
      return { uid: fbUser.uid, email: fbUser.email || null, displayName: fbUser.displayName || null, photoURL: fbUser.photoURL || null };
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const [bots, pendingPairings] = await Promise.all([
      storage.getBotsByOwnerUid(user.uid), // excludes managed agents at the storage layer
      storage.getPendingPairingCodesByOwnerUid(user.uid),
    ]);

    // Managed agents live under their own key, NOT in bots[] — every bots[]
    // consumer treats rows as linkable user-linked agents (link-bot dialogs,
    // card pickers, counts), which must never see them. Provision the one
    // runtime that exists today (loop over MANAGED_AGENT_RUNTIMES when more land).
    const managedAgentEntries: Array<{ bot_id: string; bot_name: string; description: string | null; created_at: Date }> = [];
    try {
      const email = user.email || (await storage.getOwnerByUid(user.uid))?.email;
      if (email) {
        const agent = await storage.ensureManagedAgent(user.uid, email, CROSSMINT_CHECKOUT_RUNTIME);
        const bot = await storage.getBotByBotId(agent.botId);
        if (bot) {
          managedAgentEntries.push({
            bot_id: bot.botId,
            bot_name: bot.botName,
            description: bot.description,
            created_at: bot.createdAt,
          });
        }
      }
    } catch (err) {
      // Provisioning must never break the listing — degrade to plain bots.
      console.error("ensureManagedAgent failed:", err);
    }

    return NextResponse.json({
      managed_agents: managedAgentEntries,
      pending_pairings: pendingPairings.map((pc) => ({
        code: pc.code,
        created_at: pc.createdAt,
        expires_at: pc.expiresAt,
      })),
      bots: bots.map((bot) => ({
        bot_id: bot.botId,
        bot_name: bot.botName,
        description: bot.description,
        wallet_status: bot.walletStatus,
        default_rail: bot.defaultRail || null,
        webhook_status: bot.webhookStatus || "none",
        webhook_fail_count: bot.webhookFailCount || 0,
        callback_url: bot.callbackUrl || null,
        bot_type: bot.botType || "openclaw",
        agent_platform: bot.agentPlatform || null,
        tunnel_status: bot.tunnelStatus || "none",
        created_at: bot.createdAt,
        claimed_at: bot.claimedAt,
      })),
    });
  } catch (error) {
    console.error("Get my bots error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
