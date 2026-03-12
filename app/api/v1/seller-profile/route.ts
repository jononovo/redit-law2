import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { upsertSellerProfileSchema } from "@/shared/schema";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const profile = await storage.getSellerProfileByOwnerUid(user.uid);
    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        business_name: profile.businessName,
        logo_url: profile.logoUrl,
        contact_email: profile.contactEmail,
        website_url: profile.websiteUrl,
        description: profile.description,
        slug: profile.slug,
        shop_published: profile.shopPublished,
        shop_banner_url: profile.shopBannerUrl,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET /api/v1/seller-profile error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = upsertSellerProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation_error", details: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.slug) {
      const existingSlug = await storage.getSellerProfileBySlug(parsed.data.slug);
      if (existingSlug && existingSlug.ownerUid !== user.uid) {
        return NextResponse.json({ error: "slug_taken", message: "This shop URL is already in use" }, { status: 409 });
      }
    }

    const profile = await storage.upsertSellerProfile(user.uid, {
      businessName: parsed.data.business_name ?? undefined,
      logoUrl: parsed.data.logo_url ?? undefined,
      contactEmail: parsed.data.contact_email ?? undefined,
      websiteUrl: parsed.data.website_url ?? undefined,
      description: parsed.data.description ?? undefined,
      slug: parsed.data.slug !== undefined ? parsed.data.slug : undefined,
      shopPublished: parsed.data.shop_published !== undefined ? parsed.data.shop_published : undefined,
      shopBannerUrl: parsed.data.shop_banner_url !== undefined ? parsed.data.shop_banner_url : undefined,
    });

    return NextResponse.json({
      profile: {
        id: profile.id,
        business_name: profile.businessName,
        logo_url: profile.logoUrl,
        contact_email: profile.contactEmail,
        website_url: profile.websiteUrl,
        description: profile.description,
        slug: profile.slug,
        shop_published: profile.shopPublished,
        shop_banner_url: profile.shopBannerUrl,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error("PUT /api/v1/seller-profile error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
