import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { upsertProcurementControlsSchema } from "@/shared/schema";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const controls = await storage.getProcurementControls(session.uid);
    return NextResponse.json({ controls });
  } catch (error: any) {
    console.error("GET /api/v1/procurement-controls error:", error?.message || error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = upsertProcurementControlsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { scope, scope_ref_id, ...data } = parsed.data;

    const updateData: Record<string, any> = { updatedBy: session.uid };
    if (data.allowlisted_domains !== undefined) updateData.allowlistedDomains = data.allowlisted_domains;
    if (data.blocklisted_domains !== undefined) updateData.blocklistedDomains = data.blocklisted_domains;
    if (data.allowlisted_merchants !== undefined) updateData.allowlistedMerchants = data.allowlisted_merchants;
    if (data.blocklisted_merchants !== undefined) updateData.blocklistedMerchants = data.blocklisted_merchants;
    if (data.allowlisted_categories !== undefined) updateData.allowlistedCategories = data.allowlisted_categories;
    if (data.blocklisted_categories !== undefined) updateData.blocklistedCategories = data.blocklisted_categories;
    if (data.approval_mode !== undefined) updateData.approvalMode = data.approval_mode;
    if (data.approval_threshold_cents !== undefined) updateData.approvalThresholdCents = data.approval_threshold_cents;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const control = await storage.upsertProcurementControls(
      session.uid,
      scope,
      scope_ref_id ?? null,
      updateData
    );

    return NextResponse.json({ control });
  } catch (error: any) {
    console.error("POST /api/v1/procurement-controls error:", error?.message || error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
