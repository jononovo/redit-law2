import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { storage } from "@/server/storage";
import { VendorCard } from "@/app/skills/vendor-card";
import { SECTOR_LABELS, VendorSector } from "@/lib/brand-engine/procurement-skills/types";
import { isSectorLuxuryFilter, LUXURY_TIERS } from "@/lib/brand-engine/procurement-skills/taxonomy/sectors";
import { ArrowLeft, ArrowRight, Layers } from "lucide-react";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

const ALL_SECTORS = Object.keys(SECTOR_LABELS) as VendorSector[];

const getSectorBrands = cache(async (sector: VendorSector) => {
  if (isSectorLuxuryFilter(sector)) {
    return storage.searchBrands({
      tiers: [...LUXURY_TIERS],
      maturities: ["verified", "official", "beta", "community"],
      sortBy: "score",
      sortDir: "desc",
      limit: 200,
      lite: true,
    });
  }
  return storage.searchBrands({
    sectors: [sector],
    maturities: ["verified", "official", "beta", "community"],
    sortBy: "score",
    sortDir: "desc",
    limit: 200,
    lite: true,
  });
});

const PUBLISHED_MATURITIES = ["verified", "official", "beta", "community"] as const;

const getPopulatedSectors = cache(async () => {
  try {
    const results = await Promise.all(
      ALL_SECTORS.map(async (s) => {
        if (isSectorLuxuryFilter(s)) {
          const count = await storage.searchBrandsCount({
            tiers: [...LUXURY_TIERS],
            maturities: [...PUBLISHED_MATURITIES],
          });
          return count > 0 ? s : null;
        }
        const count = await storage.searchBrandsCount({
          sectors: [s],
          maturities: [...PUBLISHED_MATURITIES],
        });
        return count > 0 ? s : null;
      })
    );
    return results.filter((s): s is VendorSector => s !== null);
  } catch {
    return [];
  }
});

export async function generateStaticParams() {
  try {
    const populated = await getPopulatedSectors();
    return populated.map((sector) => ({ sector }));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ sector: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector } = await params;
  const sectorKey = sector as VendorSector;
  const label = SECTOR_LABELS[sectorKey];

  if (!label) return {};

  const title = `${label} AI Procurement Skills | CreditClaw`;
  const description = `Browse ${label.toLowerCase()} procurement skills for AI agents. Compare checkout methods, ASX scores, and capabilities across ${label.toLowerCase()} vendors on CreditClaw.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/c/${sector}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/c/${sector}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function SectorPage({ params }: Props) {
  const { sector } = await params;
  const sectorKey = sector as VendorSector;
  const label = SECTOR_LABELS[sectorKey];

  if (!label) notFound();

  const [brands, populatedSectors] = await Promise.all([
    getSectorBrands(sectorKey),
    getPopulatedSectors(),
  ]);

  if (brands.length === 0) notFound();

  const otherSectors = populatedSectors.filter((s) => s !== sectorKey);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white" data-testid="page-sector-landing">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/skills"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary transition-colors mb-4"
            data-testid="link-back-catalog"
          >
            <ArrowLeft className="w-4 h-4" />
            All Skills
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <h1
              className="text-3xl sm:text-4xl font-extrabold text-neutral-900"
              data-testid="heading-sector"
            >
              {label}
            </h1>
          </div>

          <p className="text-neutral-600 max-w-2xl" data-testid="text-sector-description">
            {brands.length} procurement {brands.length === 1 ? "skill" : "skills"} for AI
            agents in the {label.toLowerCase()} sector. Compare checkout methods, ASX
            scores, and capabilities.
          </p>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
          data-testid="grid-sector-brands"
        >
          {brands.map((brand) => (
            <VendorCard key={brand.id} brand={brand} />
          ))}
        </div>

        {otherSectors.length > 0 && (
          <section className="border-t border-neutral-100 pt-10" data-testid="section-other-sectors">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">
              Explore other sectors
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherSectors.map((s) => (
                <Link
                  key={s}
                  href={`/c/${s}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-neutral-50 text-neutral-700 border border-neutral-100 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all"
                  data-testid={`link-sector-${s}`}
                >
                  {SECTOR_LABELS[s]}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
