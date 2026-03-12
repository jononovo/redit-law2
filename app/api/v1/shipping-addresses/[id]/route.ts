import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { z } from "zod";

const updateShippingAddressSchema = z.object({
  label: z.string().max(100).optional().nullable(),
  isDefault: z.boolean().optional(),
  name: z.string().min(1).max(200).optional(),
  line1: z.string().min(1).max(500).optional(),
  line2: z.string().max(500).optional().nullable(),
  city: z.string().min(1).max(200).optional(),
  state: z.string().min(1).max(100).optional(),
  postalCode: z.string().min(1).max(20).optional(),
  country: z.string().length(2).optional(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
});

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
    const addressId = parseInt(id, 10);
    if (isNaN(addressId)) {
      return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
    }

    const existing = await storage.getShippingAddressesByOwner(user.uid);
    const owns = existing.find((a) => a.id === addressId);
    if (!owns) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateShippingAddressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const address = await storage.updateShippingAddress(addressId, { ...parsed.data, ownerUid: user.uid });
    return NextResponse.json({ address });
  } catch (error) {
    console.error("PATCH /api/v1/shipping-addresses/[id] error:", error);
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
    const addressId = parseInt(id, 10);
    if (isNaN(addressId)) {
      return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
    }

    const existing = await storage.getShippingAddressesByOwner(user.uid);
    const owns = existing.find((a) => a.id === addressId);
    if (!owns) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    await storage.deleteShippingAddress(addressId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/v1/shipping-addresses/[id] error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
