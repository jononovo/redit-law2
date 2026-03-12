import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { analyzeVendor } from "@/lib/procurement-skills/builder/analyze";
import { storage } from "@/server/storage";
import { submitVendorSchema } from "@/shared/schema";

function computeSubmitterType(userEmail: string | null, vendorUrl: string): "official" | "community" {
  if (!userEmail) return "community";
  const emailDomain = userEmail.split("@")[1]?.toLowerCase();
  if (!emailDomain) return "community";

  try {
    const vendorDomain = new URL(vendorUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (emailDomain === vendorDomain || emailDomain.endsWith(`.${vendorDomain}`)) {
      return "official";
    }
  } catch {
    // ignore
  }
  return "community";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "unauthorized", message: "You must be signed in to submit a vendor skill" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = submitVendorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: "A valid URL is required", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { url } = parsed.data;

    const submitterType = computeSubmitterType(user.email, url);

    await storage.upsertSubmitterProfile(user.uid, {
      displayName: user.displayName,
      email: user.email,
    });
    await storage.incrementSubmitterStat(user.uid, "skillsSubmitted");

    const result = await analyzeVendor(url);

    const draft = await storage.createSkillDraftWithEvidence(
      {
        vendorUrl: url,
        vendorSlug: (result.draft.slug as string) || null,
        vendorData: result.draft as Record<string, unknown>,
        confidence: result.confidence,
        reviewNeeded: result.reviewNeeded,
        status: "pending",
        autoPublish: false,
        createdBy: user.uid,
        submitterUid: user.uid,
        submitterEmail: user.email,
        submitterName: user.displayName,
        submitterType,
        submissionSource: "community",
        warnings: result.warnings,
      },
      result.evidence.map(ev => ({
        draftId: 0,
        field: ev.field,
        source: ev.source,
        url: ev.url,
        snippet: ev.snippet,
      }))
    );

    return NextResponse.json({
      id: draft.id,
      status: draft.status,
      submitterType,
      reviewNeeded: draft.reviewNeeded,
      warnings: draft.warnings,
      confidence: draft.confidence,
      vendor: draft.vendorData,
      message: submitterType === "official"
        ? "Your submission has been flagged as an official vendor skill and will receive fast-track review."
        : "Your submission has been received and will be reviewed by our team.",
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[skill-submissions] Submission failed:", message);
    return NextResponse.json(
      { error: "submission_failed", message },
      { status: 500 }
    );
  }
}
