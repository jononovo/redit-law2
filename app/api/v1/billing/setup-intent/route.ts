import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrCreateCustomer, createSetupIntent } from "@/lib/stripe";
import { storage } from "@/server/storage";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const customerId = await getOrCreateCustomer(user.email, user.uid);
    const setupIntent = await createSetupIntent(customerId);

    return NextResponse.json({
      client_secret: setupIntent.client_secret,
      customer_id: customerId,
    });
  } catch (error) {
    console.error("Setup intent error:", error);
    return NextResponse.json({ error: "Failed to create setup intent" }, { status: 500 });
  }
}
