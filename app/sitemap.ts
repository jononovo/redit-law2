import type { MetadataRoute } from "next";
import { sections } from "@/app/docs/content/sections";
import { getAllPosts, getAllTags } from "@/content/blog/posts";
import { categories } from "@/content/blog/taxonomy";
import { storage } from "@/server/storage";
import { SECTOR_LABELS, VendorSector } from "@/features/brand-engine/procurement-skills/types";
import { isSectorLuxuryFilter, LUXURY_TIERS } from "@/features/brand-engine/procurement-skills/taxonomy/sectors";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/how-it-works`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/safety`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/skills`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/solutions/card-wallet`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/solutions/stripe-wallet`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/allowance`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/newsroom`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/docs`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const docPages: MetadataRoute.Sitemap = [];
  for (const section of sections) {
    for (const page of section.pages) {
      docPages.push({
        url: `${BASE_URL}/docs/${section.slug}/${page.slug}`,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  const blogPostPages: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${BASE_URL}/newsroom/${post.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const blogCategoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/newsroom/category/${cat.slug}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const blogTagPages: MetadataRoute.Sitemap = getAllTags().map((tagSlug) => ({
    url: `${BASE_URL}/newsroom/tag/${tagSlug}`,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  let brandPages: MetadataRoute.Sitemap = [];
  let sectorPages: MetadataRoute.Sitemap = [];

  try {
    const brands = await storage.searchBrands({
      maturities: ["verified", "official", "beta", "community"],
      limit: 500,
      sortBy: "name",
      sortDir: "asc",
      lite: true,
    });

    brandPages = brands.map((b) => ({
      url: `${BASE_URL}/skills/${b.slug}`,
      lastModified: b.updatedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const allSectors = Object.keys(SECTOR_LABELS) as VendorSector[];
    const sectorCounts = await Promise.all(
      allSectors.map(async (s) => {
        if (isSectorLuxuryFilter(s)) {
          const count = await storage.searchBrandsCount({
            tiers: [...LUXURY_TIERS],
            maturities: ["verified", "official", "beta", "community"],
          });
          return { sector: s, count };
        }
        const count = await storage.searchBrandsCount({
          sectors: [s],
          maturities: ["verified", "official", "beta", "community"],
        });
        return { sector: s, count };
      })
    );
    sectorPages = sectorCounts
      .filter((sc) => sc.count > 0)
      .map((sc) => ({
        url: `${BASE_URL}/c/${sc.sector}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
  }

  return [...staticPages, ...docPages, ...blogPostPages, ...blogCategoryPages, ...blogTagPages, ...brandPages, ...sectorPages];
}
