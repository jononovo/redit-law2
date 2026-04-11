import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Missing email parameter" }, { status: 400 });
  }

  const owner = await storage.getOwnerByEmail(email);
  return NextResponse.json({ exists: !!owner });
}
