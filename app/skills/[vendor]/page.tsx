import { cache } from "react";
import { notFound } from "next/navigation";
import { storage } from "@/server/storage";
import { generateVendorSkill } from "@/lib/procurement-skills/generator";
import type { VendorSkill, VendorSector } from "@/lib/procurement-skills/types";
import type { Metadata } from "next";
import { SkillDetailContent } from "./skill-detail-content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

export const revalidate = 3600;

const getBrand = cache(async (slug: string) => {
  return storage.getBrandBySlug(slug);
});

interface Props {
  params: Promise<{ vendor: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vendor: slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return {};

  const score = brand.overallScore;
  const capabilities = (brand.capabilities ?? []).slice(0, 5).join(", ");

  return {
    title: `${brand.name} — Agent Shopping Skill`,
    description: `${brand.name} ASX Score: ${score ?? "unscored"}. Checkout methods: ${(brand.checkoutMethods ?? []).join(", ")}. Capabilities: ${capabilities}. ${brand.description || ""}`.slice(0, 160),
    openGraph: {
      title: `${brand.name} — Agent Shopping Skill`,
      description: `Agent-ready shopping skill for ${brand.name}. Sector: ${brand.sector}. Maturity: ${brand.maturity}.`,
      type: "website",
      url: `${BASE_URL}/skills/${brand.slug}`,
    },
    twitter: {
      card: "summary",
      title: `${brand.name} — Agent Shopping Skill`,
      description: `ASX Score: ${score ?? "unscored"}/100. ${(brand.checkoutMethods ?? []).length} checkout methods available.`,
    },
    alternates: {
      canonical: `${BASE_URL}/skills/${brand.slug}`,
    },
  };
}

export default async function VendorDetailPage({ params }: Props) {
  const { vendor: slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const rawVendor = brand.brandData as unknown as VendorSkill | null;
  const hasVendorData = rawVendor && typeof rawVendor === "object" && "name" in rawVendor;
  const vendor = hasVendorData ? rawVendor : null;
  const vendorName = vendor?.name ?? brand.name;
  const vendorUrl = vendor?.url ?? `https://${brand.domain}`;
  const vendorSector = (vendor?.sector ?? brand.sector) as VendorSector;
  const score = brand.overallScore;
  const skillMd = brand.skillMd || (vendor ? generateVendorSkill(vendor) : null);
  const skillUrl = `https://creditclaw.com/api/v1/bot/skills/${brand.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${vendorName} — AI Shopping Skill`,
    description: brand.description || `Agent-ready shopping skill for ${vendorName}.`,
    url: `${BASE_URL}/skills/${brand.slug}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Cloud",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: brand.axsRating ? {
      "@type": "AggregateRating",
      ratingValue: Number(brand.axsRating).toFixed(1),
      bestRating: "5",
      worstRating: "1",
      ratingCount: brand.ratingCount ?? 0,
    } : undefined,
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "asxScore",
        value: score,
      },
      {
        "@type": "PropertyValue",
        name: "sector",
        value: brand.sector,
      },
      {
        "@type": "PropertyValue",
        name: "maturity",
        value: brand.maturity,
      },
      ...(brand.checkoutMethods ?? []).map(method => ({
        "@type": "PropertyValue",
        name: "checkoutMethod",
        value: method,
      })),
    ],
  };

  return (
    <SkillDetailContent
      vendorName={vendorName}
      vendorUrl={vendorUrl}
      vendorSector={vendorSector}
      score={score}
      maturityKey={brand.maturity}
      skillMd={skillMd}
      skillUrl={skillUrl}
      slug={brand.slug}
      vendor={vendor}
      brand={{
        slug: brand.slug,
        name: brand.name,
        domain: brand.domain,
        sector: brand.sector,
        maturity: brand.maturity,
        overallScore: brand.overallScore,
        checkoutMethods: brand.checkoutMethods,
        capabilities: brand.capabilities,
        axsRating: brand.axsRating,
        ratingCount: brand.ratingCount,
        ratingSearchAccuracy: brand.ratingSearchAccuracy,
        ratingStockReliability: brand.ratingStockReliability,
        ratingCheckoutCompletion: brand.ratingCheckoutCompletion,
        lastScannedAt: brand.lastScannedAt ? brand.lastScannedAt.toISOString() : null,
        description: brand.description,
      }}
      jsonLd={jsonLd}
    />
  );
}
