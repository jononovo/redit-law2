import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const accountId = Number(id);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    const accounts = await storage.getMerchantAccountsByOwner(user.uid);
    const existing = accounts.find((a) => a.id === accountId);
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.accountIdentifier !== undefined) updates.accountIdentifier = body.accountIdentifier;
    if (body.encryptedCredentials !== undefined) updates.encryptedCredentials = body.encryptedCredentials;
    if (body.encryptionMethod !== undefined) updates.encryptionMethod = body.encryptionMethod;
    if (body.status !== undefined) updates.status = body.status;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    const updated = await storage.updateMerchantAccount(accountId, updates as any);
    if (!updated) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ account: updated });
  } catch (error) {
    console.error("PATCH /api/v1/merchant-accounts/[id] error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const accountId = Number(id);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    const accounts = await storage.getMerchantAccountsByOwner(user.uid);
    const existing = accounts.find((a) => a.id === accountId);
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await storage.deleteMerchantAccount(accountId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/v1/merchant-accounts/[id] error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
