import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "unauthorized", message: "You must be signed in to view your submissions" },
        { status: 401 }
      );
    }

    const [drafts, profile] = await Promise.all([
      storage.listSkillDraftsBySubmitter(user.uid),
      storage.getSubmitterProfile(user.uid),
    ]);

    return NextResponse.json({
      submissions: drafts.map(d => ({
        id: d.id,
        vendorUrl: d.vendorUrl,
        vendorSlug: d.vendorSlug,
        vendorName: (d.vendorData as Record<string, unknown>)?.name || d.vendorSlug || "Unknown",
        status: d.status,
        submitterType: d.submitterType,
        reviewNeeded: d.reviewNeeded,
        confidence: d.confidence,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      profile: profile ? {
        skillsSubmitted: profile.skillsSubmitted,
        skillsPublished: profile.skillsPublished,
        skillsRejected: profile.skillsRejected,
      } : null,
      total: drafts.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "fetch_failed", message },
      { status: 500 }
    );
  }
}
