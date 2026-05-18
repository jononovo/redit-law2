import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { createAgent, ownerUidToUserLocator, CrossmintApiError } from "@/features/payment-rails/rail3";

// Crossmint docs example defaults.
const DEFAULT_AGENT_NAME = "Card Payment Agent";
const DEFAULT_AGENT_DESCRIPTION = "Default agent for card payments";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const row = await storage.getRail3AgentByOwnerUid(user.uid);
  if (!row) return NextResponse.json({ agent: null });

  return NextResponse.json({
    agent: { agent_id: row.agentId, created_at: row.createdAt.toISOString() },
  });
}

// Idempotent: returns the existing agent if one already exists for this owner.
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const existing = await storage.getRail3AgentByOwnerUid(user.uid);
  if (existing) {
    return NextResponse.json({
      agent: { agent_id: existing.agentId, created_at: existing.createdAt.toISOString() },
      already_existed: true,
    });
  }

  try {
    const created = await createAgent({
      userLocator: ownerUidToUserLocator(user.uid),
      name: DEFAULT_AGENT_NAME,
      description: DEFAULT_AGENT_DESCRIPTION,
    });
    const row = await storage.createRail3Agent({ ownerUid: user.uid, agentId: created.agentId });
    return NextResponse.json({
      agent: { agent_id: row.agentId, created_at: row.createdAt.toISOString() },
    });
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "create_agent_failed";
    console.error("[Rail3] createAgent failed:", message);
    return NextResponse.json({ error: "create_agent_failed", message }, { status });
  }
}
