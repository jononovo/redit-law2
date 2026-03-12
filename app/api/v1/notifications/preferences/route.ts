import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { updateNotificationPreferencesSchema } from "@/shared/schema";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const prefs = await storage.getNotificationPreferences(user.uid);

    return NextResponse.json({
      preferences: prefs
        ? {
            transaction_alerts: prefs.transactionAlerts,
            budget_warnings: prefs.budgetWarnings,
            weekly_summary: prefs.weeklySummary,
            purchase_over_threshold_usd: prefs.purchaseOverThresholdCents / 100,
            balance_low_usd: prefs.balanceLowCents / 100,
            email_enabled: prefs.emailEnabled,
            in_app_enabled: prefs.inAppEnabled,
          }
        : {
            transaction_alerts: true,
            budget_warnings: true,
            weekly_summary: false,
            purchase_over_threshold_usd: 50,
            balance_low_usd: 5,
            email_enabled: true,
            in_app_enabled: true,
          },
    });
  } catch (error) {
    console.error("Get notification preferences error:", error);
    return NextResponse.json({ error: "Failed to get preferences" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateNotificationPreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.transaction_alerts !== undefined) data.transactionAlerts = parsed.data.transaction_alerts;
    if (parsed.data.budget_warnings !== undefined) data.budgetWarnings = parsed.data.budget_warnings;
    if (parsed.data.weekly_summary !== undefined) data.weeklySummary = parsed.data.weekly_summary;
    if (parsed.data.email_enabled !== undefined) data.emailEnabled = parsed.data.email_enabled;
    if (parsed.data.in_app_enabled !== undefined) data.inAppEnabled = parsed.data.in_app_enabled;
    if (parsed.data.purchase_over_threshold_usd !== undefined) {
      data.purchaseOverThresholdCents = Math.round(parsed.data.purchase_over_threshold_usd * 100);
    }
    if (parsed.data.balance_low_usd !== undefined) {
      data.balanceLowCents = Math.round(parsed.data.balance_low_usd * 100);
    }

    const updated = await storage.upsertNotificationPreferences(user.uid, data);

    return NextResponse.json({
      preferences: {
        transaction_alerts: updated.transactionAlerts,
        budget_warnings: updated.budgetWarnings,
        weekly_summary: updated.weeklySummary,
        purchase_over_threshold_usd: updated.purchaseOverThresholdCents / 100,
        balance_low_usd: updated.balanceLowCents / 100,
        email_enabled: updated.emailEnabled,
        in_app_enabled: updated.inAppEnabled,
      },
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
