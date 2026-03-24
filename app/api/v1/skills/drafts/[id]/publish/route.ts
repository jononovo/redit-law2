import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { prepareVersionData } from "@/lib/procurement-skills/versioning";
import { generateVendorSkill } from "@/lib/procurement-skills/generator";
import type { VendorSkill } from "@/lib/procurement-skills/types";
import type { SourceType } from "@/lib/procurement-skills/versioning";
import type { InsertBrandIndex } from "@/shared/schema";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const draftId = parseInt(id, 10);
    if (isNaN(draftId)) {
      return NextResponse.json({ error: "invalid_id", message: "Draft ID must be a number" }, { status: 400 });
    }

    const draft = await storage.getSkillDraft(draftId);
    if (!draft) {
      return NextResponse.json({ error: "not_found", message: `Draft ${draftId} not found` }, { status: 404 });
    }

    if (draft.status === "published") {
      return NextResponse.json({ error: "already_published", message: "This draft is already published" }, { status: 400 });
    }

    const vendorData = draft.vendorData as Record<string, unknown>;

    const requiredFields = ["slug", "name", "category", "url", "checkoutMethods", "capabilities"];
    const missing = requiredFields.filter(f => !vendorData[f]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "incomplete_draft", message: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const vendor = vendorData as unknown as VendorSkill;
    const vendorSlug = vendor.slug || draft.vendorSlug || "";

    const existingVersion = await storage.getActiveVersion(vendorSlug);

    const sourceType: SourceType = draft.submissionSource === "community" ? "community" : "draft";
    const changeType = existingVersion ? (sourceType === "community" ? "community_update" : "edit") : "initial";

    const versionData = prepareVersionData({
      vendorSlug,
      vendorData: vendor,
      changeType: changeType as any,
      changeSummary: existingVersion
        ? `Published from draft #${draftId}`
        : `Initial publish from draft #${draftId}`,
      publishedBy: user.uid,
      sourceType,
      sourceDraftId: draftId,
      previousVersion: existingVersion
        ? {
            id: existingVersion.id,
            version: existingVersion.version,
            vendorData: existingVersion.vendorData as unknown as VendorSkill,
          }
        : undefined,
    });

    await storage.deactivateVersions(vendorSlug);
    const newVersion = await storage.createSkillVersion(versionData);

    const updated = await storage.updateSkillDraft(draftId, { status: "published" });

    if (draft.submitterUid && draft.submissionSource === "community") {
      await storage.incrementSubmitterStat(draft.submitterUid, "skillsPublished");
    }

    try {
      const skillMd = generateVendorSkill(vendor);
      const domain = (() => { try { return new URL(vendor.url).hostname.replace(/^www\./, ""); } catch { return null; } })();
      const brandRow: InsertBrandIndex = {
        slug: vendorSlug,
        name: vendor.name,
        domain,
        url: vendor.url,
        logoUrl: vendor.logoUrl ?? null,
        description: `Shop ${vendor.name} using CreditClaw payment rails.`,
        sector: vendor.taxonomy?.sector ?? vendor.category ?? "retail",
        subSectors: vendor.taxonomy?.subSectors ?? [],
        tier: vendor.taxonomy?.tier ?? null,
        tags: vendor.taxonomy?.tags ?? [],
        carriesBrands: [],
        hasMcp: vendor.searchDiscovery?.mcp ?? false,
        hasApi: vendor.searchDiscovery?.searchApi ?? false,
        siteSearch: vendor.searchDiscovery?.searchInternal ?? true,
        productFeed: false,
        capabilities: vendor.capabilities ?? [],
        checkoutMethods: vendor.checkoutMethods ?? [],
        ordering: vendor.buying?.orderingPermission ?? (vendor.checkout?.guestCheckout ? "guest" : "registered"),
        checkoutProvider: vendor.buying?.checkoutProviders?.[0] ?? null,
        paymentMethodsAccepted: vendor.buying?.paymentMethods ?? [],
        creditclawSupports: [],
        businessAccount: vendor.capabilities?.includes("business_invoicing") ?? false,
        taxExemptSupported: vendor.checkout?.taxExemptField ?? false,
        poNumberSupported: vendor.checkout?.poNumberField ?? false,
        deliveryOptions: vendor.buying?.deliveryOptions?.split(",").map((s: string) => s.trim()) ?? [],
        freeShippingThreshold: vendor.shipping?.freeThreshold?.toString() ?? null,
        shipsInternationally: false,
        supportedCountries: ["US"],
        hasDeals: vendor.deals?.currentDeals ?? false,
        dealsUrl: vendor.deals?.dealsUrl ?? null,
        dealsApi: vendor.deals?.dealsApiEndpoint ?? null,
        loyaltyProgram: vendor.deals?.loyaltyProgram ?? null,
        maturity: vendor.maturity ?? "draft",
        submittedBy: user.uid,
        submitterType: draft.submitterType ?? "community",
        version: newVersion.version,
        lastVerified: vendor.lastVerified ?? null,
        activeVersionId: newVersion.id,
        brandData: vendor as unknown as Record<string, unknown>,
        skillMd,
      };
      await storage.upsertBrandIndex(brandRow);
    } catch (brandErr) {
      console.error("Failed to sync brand_index after publish:", brandErr);
    }

    return NextResponse.json({
      id: updated!.id,
      status: "published",
      vendorSlug: updated!.vendorSlug,
      skillMd: versionData.skillMd,
      version: newVersion.version,
      versionId: newVersion.id,
      submitterType: draft.submitterType,
      submitterName: draft.submitterName,
      message: "Draft published successfully with version tracking.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "publish_failed", message }, { status: 500 });
  }
}
