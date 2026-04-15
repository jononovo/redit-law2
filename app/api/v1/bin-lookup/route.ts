import { NextRequest, NextResponse } from "next/server";
import { lookupIssuer } from "@/features/payment-rails/card/bin-lookup";

export async function GET(request: NextRequest) {
  const bin = request.nextUrl.searchParams.get("bin");

  if (!bin || bin.length < 6 || !/^\d{6,}$/.test(bin)) {
    return NextResponse.json(
      { error: "invalid_bin", message: "Provide at least 6 digits." },
      { status: 400 }
    );
  }

  const issuer = lookupIssuer(bin.slice(0, 6));

  return NextResponse.json({ issuer: issuer || null });
}
