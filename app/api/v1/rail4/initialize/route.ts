import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { generateRail4Setup } from "@/lib/rail4/obfuscation";
import { generateCardId } from "@/lib/agent-management/crypto";

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

  const cardName = typeof body.card_name === "string" ? body.card_name.slice(0, 200) : "Untitled Card";
  const useCase = typeof body.use_case === "string" ? body.use_case.slice(0, 500) : undefined;

  const generatedCardId = generateCardId();
  const setup = generateRail4Setup();

  const card = await storage.createRail4Card({
    cardId: generatedCardId,
    ownerUid: user.uid,
    cardName,
    useCase: useCase || null,
    decoyFilename: setup.decoyFilename,
    realProfileIndex: setup.realProfileIndex,
    missingDigitPositions: setup.missingDigitPositions,
    missingDigitsValue: "000",
    status: "pending_setup",
    fakeProfilesJson: JSON.stringify(setup.fakeProfiles),
    profilePermissions: JSON.stringify(setup.profilePermissions),
  });

  return NextResponse.json({
    card_id: generatedCardId,
    card_name: cardName,
    decoy_filename: setup.decoyFilename,
    real_profile_index: setup.realProfileIndex,
    missing_digit_positions: setup.missingDigitPositions,
    instructions: `Your payment profiles file will be "${setup.decoyFilename}". Profile #${setup.realProfileIndex} is your real card. The 3 digits at positions ${setup.missingDigitPositions.map(p => p + 1).join(", ")} are never stored. Complete setup by entering card details, setting permissions, then downloading the file.`,
  });
}
