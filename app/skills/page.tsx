import { storage } from "@/server/storage";
import CatalogClient from "./catalog-client";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";
const PAGE_SIZE = 50;

export async function generateMetadata(): Promise<Metadata> {
  const total = await storage.searchBrandsCount({
    maturities: ["verified", "official", "beta", "community"],
  });

  const title = "Skill Index — AI Agent Procurement Skills | CreditClaw";
  const description = `Browse ${total}+ procurement skills that teach AI agents how to shop at verified vendors. Filter by sector, checkout method, and agent readiness score.`;

  return {
    title,
    description,
    openGraph: {
      title: "Skill Index — AI Agent Procurement Skills",
      description,
      type: "website",
      url: `${BASE_URL}/skills`,
    },
    twitter: {
      card: "summary",
      title: "Skill Index — CreditClaw",
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/skills`,
    },
  };
}

export default async function SkillsCatalogPage() {
  const [brands, facets, total] = await Promise.all([
    storage.searchBrands({
      maturities: ["verified", "official", "beta", "community"],
      sortBy: "readiness",
      sortDir: "desc",
      limit: PAGE_SIZE,
      lite: true,
    }),
    storage.getAllBrandFacets(),
    storage.searchBrandsCount({
      maturities: ["verified", "official", "beta", "community"],
    }),
  ]);

  return (
    <CatalogClient
      initialBrands={brands}
      initialFacets={facets}
      initialTotal={total}
    />
  );
}
