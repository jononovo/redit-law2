import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { rail4SubmitOwnerDataSchema } from "@/shared/schema";
import { initializeState } from "@/lib/obfuscation-engine/state-machine";
import { buildDecoyFileContent } from "@/lib/rail4/obfuscation";
import type { FakeProfile } from "@/lib/rail4/obfuscation";
import type { ProfilePermission } from "@/shared/schema";

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = rail4SubmitOwnerDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { card_id, missing_digits, expiry_month, expiry_year, owner_name, owner_zip, profile_permissions } = parsed.data;

  const card = await storage.getRail4CardByCardId(card_id);
  if (!card || card.ownerUid !== user.uid) {
    return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  }

  if (card.status === "active" || card.status === "awaiting_bot") {
    return NextResponse.json({ error: "already_configured" }, { status: 409 });
  }

  const ownerIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  const existingPerms: ProfilePermission[] = card.profilePermissions ? JSON.parse(card.profilePermissions) : [];
  let updatedPerms = [...existingPerms];

  if (profile_permissions) {
    updatedPerms = existingPerms.map((p) =>
      p.profile_index === card.realProfileIndex ? { ...profile_permissions, profile_index: card.realProfileIndex } : p
    );
    const hasRealProfile = updatedPerms.some((p) => p.profile_index === card.realProfileIndex);
    if (!hasRealProfile) {
      updatedPerms.push({ ...profile_permissions, profile_index: card.realProfileIndex });
    }
  }

  const updateData: Record<string, unknown> = {
    missingDigitsValue: missing_digits,
    expiryMonth: expiry_month,
    expiryYear: expiry_year,
    ...(owner_name ? { ownerName: owner_name } : {}),
    ownerZip: owner_zip,
    ownerIp: ownerIp,
    status: "awaiting_bot",
    profilePermissions: JSON.stringify(updatedPerms),
  };

  await storage.updateRail4CardByCardId(card_id, updateData as any);

  initializeState(card_id).catch(err => {
    console.error("Failed to initialize obfuscation state:", err);
  });

  const fakeProfiles: FakeProfile[] = card.fakeProfilesJson ? JSON.parse(card.fakeProfilesJson) : [];
  const paymentProfilesContent = buildDecoyFileContent(
    card.realProfileIndex,
    card.missingDigitPositions,
    fakeProfiles,
    updatedPerms,
    card.cardName,
  );

  return NextResponse.json({
    status: "awaiting_bot",
    message: "Card setup complete. Connect your bot to activate the card.",
    payment_profiles_filename: card.decoyFilename,
    payment_profiles_content: paymentProfilesContent,
  });
}
