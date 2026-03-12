import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";
import { storage } from "@/server/storage";

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
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const [bots, wallets, privyWallets, crossmintWallets, rail4Cards, rail5Cards] = await Promise.all([
      storage.getBotsByOwnerUid(user.uid),
      storage.getWalletsWithBotsByOwnerUid(user.uid),
      storage.privyGetWalletsByOwnerUid(user.uid),
      storage.crossmintGetWalletsByOwnerUid(user.uid),
      storage.getRail4CardsByOwnerUid(user.uid),
      storage.getRail5CardsByOwnerUid(user.uid),
    ]);

    const walletMap = new Map(wallets.map(w => [w.botId, w]));
    const privyMap = new Map(privyWallets.map(w => [w.botId, w]));
    const crossmintMap = new Map(crossmintWallets.map(w => [w.botId, w]));

    const rail4ByBot = new Map<string, typeof rail4Cards>();
    for (const card of rail4Cards) {
      if (card.botId) {
        const existing = rail4ByBot.get(card.botId) || [];
        existing.push(card);
        rail4ByBot.set(card.botId, existing);
      }
    }

    const rail5Map = new Map(rail5Cards.filter(c => c.botId).map(c => [c.botId!, c]));

    const botsWithRails = bots.map(bot => {
      const rails: Record<string, any> = {};

      const wallet = walletMap.get(bot.botId);
      if (wallet) {
        rails.card_wallet = {
          status: wallet.balanceCents > 0 ? "active" : "empty",
          balance_usd: wallet.balanceCents / 100,
        };
      }

      const privy = privyMap.get(bot.botId);
      if (privy) {
        rails.stripe_wallet = {
          status: privy.status === "active" ? "active" : "inactive",
          balance_usd: privy.balanceUsdc / 1_000_000,
        };
      }

      const crossmint = crossmintMap.get(bot.botId);
      if (crossmint) {
        rails.shopping_wallet = {
          status: crossmint.status === "active" ? "active" : "inactive",
          balance_usd: crossmint.balanceUsdc / 1_000_000,
        };
      }

      const r4Cards = rail4ByBot.get(bot.botId);
      if (r4Cards && r4Cards.length > 0) {
        rails.self_hosted_cards = {
          status: "active",
          card_count: r4Cards.length,
        };
      }

      const r5 = rail5Map.get(bot.botId);
      if (r5) {
        rails.sub_agent_cards = {
          status: "active",
        };
      }

      return {
        bot_id: bot.botId,
        bot_name: bot.botName,
        wallet_status: bot.walletStatus,
        default_rail: bot.defaultRail || null,
        active_rails: Object.keys(rails),
        rails,
        created_at: bot.createdAt,
      };
    });

    return NextResponse.json({ bots: botsWithRails });
  } catch (error) {
    console.error("Get bots with rails error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
