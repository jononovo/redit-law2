import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { z } from "zod";

const botUpdateSellerProfileSchema = z.object({
  business_name: z.string().min(1).max(200).optional(),
  slug: z.string().max(100).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, "Slug must be lowercase letters, numbers, and hyphens").optional(),
  description: z.string().max(2000).optional().nullable(),
  logo_url: z.string().url().max(2000).optional().nullable(),
  shop_banner_url: z.string().url().max(2000).optional().nullable(),
  shop_published: z.boolean().optional(),
});

export const GET = withBotApi("/api/v1/bot/seller-profile", async (request, { bot }) => {
  if (!bot.ownerUid) {
    return NextResponse.json({ error: "Bot not claimed" }, { status: 403 });
  }

  const profile = await storage.getSellerProfileByOwnerUid(bot.ownerUid);
  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({
    profile: {
      business_name: profile.businessName,
      slug: profile.slug,
      description: profile.description,
      logo_url: profile.logoUrl,
      shop_banner_url: profile.shopBannerUrl,
      shop_published: profile.shopPublished,
      created_at: profile.createdAt?.toISOString() || null,
      updated_at: profile.updatedAt?.toISOString() || null,
    },
  });
});

export const PATCH = withBotApi("/api/v1/bot/seller-profile", async (request, { bot }) => {
  if (!bot.ownerUid) {
    return NextResponse.json({ error: "Bot not claimed" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = botUpdateSellerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: parsed.error.issues[0]?.message || "Invalid request body." },
      { status: 400 }
    );
  }

  if (parsed.data.slug) {
    const existingSlug = await storage.getSellerProfileBySlug(parsed.data.slug);
    if (existingSlug && existingSlug.ownerUid !== bot.ownerUid) {
      return NextResponse.json({ error: "slug_taken", message: "This shop URL is already in use" }, { status: 409 });
    }
  }

  const profile = await storage.upsertSellerProfile(bot.ownerUid, {
    businessName: parsed.data.business_name ?? undefined,
    slug: parsed.data.slug !== undefined ? parsed.data.slug : undefined,
    description: parsed.data.description ?? undefined,
    logoUrl: parsed.data.logo_url ?? undefined,
    shopBannerUrl: parsed.data.shop_banner_url ?? undefined,
    shopPublished: parsed.data.shop_published !== undefined ? parsed.data.shop_published : undefined,
  });

  return NextResponse.json({
    profile: {
      business_name: profile.businessName,
      slug: profile.slug,
      description: profile.description,
      logo_url: profile.logoUrl,
      shop_banner_url: profile.shopBannerUrl,
      shop_published: profile.shopPublished,
      created_at: profile.createdAt?.toISOString() || null,
      updated_at: profile.updatedAt?.toISOString() || null,
    },
  });
});
