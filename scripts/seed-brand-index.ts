import { db } from "@/server/db";
import { brandIndex } from "@/shared/schema";
import {
  amazon, shopify, amazon_business, walmart, walmart_business,
  staples, home_depot, lowes, office_depot, uline,
  grainger, newegg, bh_photo, mcmaster_carr,
} from "@/lib/procurement-skills/vendors";
import { generateVendorSkill } from "@/lib/procurement-skills/generator";
import type { VendorSkill } from "@/lib/procurement-skills/types";

const CARRIES_BRANDS: Record<string, string[]> = {
  "amazon": ["Apple", "Samsung", "Sony", "Bose", "Anker", "Logitech", "Nike", "Lego", "KitchenAid", "Instant Pot"],
  "amazon-business": ["3M", "Rubbermaid", "HP", "Brother", "Avery", "Fellowes", "Kimberly-Clark", "Georgia-Pacific"],
  "walmart": ["Samsung", "Apple", "Sony", "Ninja", "Ozark Trail", "Great Value", "Dyson", "Keurig", "Lego", "Crayola"],
  "walmart-business": ["3M", "Rubbermaid", "Clorox", "Bounty", "Lysol", "Hefty", "Dixie", "Scott"],
  "shopify": [],
  "staples": ["HP", "Brother", "Epson", "Canon", "Avery", "3M", "Bic", "Sharpie", "Hammermill", "Swingline"],
  "home-depot": ["DeWalt", "Milwaukee", "Ryobi", "Husky", "Behr", "LG", "Samsung", "Whirlpool", "Glacier Bay", "HDX"],
  "lowes": ["Craftsman", "Kobalt", "Allen + Roth", "GE", "Whirlpool", "Samsung", "Valspar", "STAINMASTER", "John Deere", "Husqvarna"],
  "office-depot": ["HP", "Brother", "Epson", "Canon", "Avery", "3M", "Bic", "Serta", "Realspace", "TUL"],
  "uline": ["3M", "Rubbermaid", "Georgia-Pacific", "Kimberly-Clark", "Scotch", "Duck Brand", "Shurtape", "Brady"],
  "grainger": ["3M", "Honeywell", "DeWalt", "Milwaukee", "Dayton", "MSA", "Condor", "Tough Guy"],
  "newegg": ["NVIDIA", "AMD", "Intel", "ASUS", "Corsair", "EVGA", "MSI", "Western Digital", "Seagate", "Logitech"],
  "bh-photo": ["Canon", "Nikon", "Sony", "Fujifilm", "DJI", "Apple", "Samsung", "Panasonic", "Blackmagic", "Rode"],
  "mcmaster-carr": ["3M", "Parker", "Grainger", "Lincoln Electric", "Mitutoyo", "Starrett", "Vishay", "Eaton"],
};

const DESCRIPTIONS: Record<string, string> = {
  "amazon": "The world's largest online marketplace offering millions of products across electronics, home, fashion, grocery, and more. Supports programmatic purchasing via CreditClaw's native API integration with ASIN-based ordering.",
  "amazon-business": "Amazon's B2B platform offering business pricing, quantity discounts, tax exemption, PO numbers, and approval workflows. Ideal for enterprise procurement with multi-user account management.",
  "walmart": "America's largest retailer with extensive online selection across groceries, electronics, home goods, and apparel. Guest checkout available with competitive pricing and free shipping over $35.",
  "walmart-business": "Walmart's business purchasing platform with bulk pricing, tax exemption certificates, PO number support, and business invoicing for enterprise and government buyers.",
  "shopify": "Universal connector for any Shopify-powered storefront. Supports programmatic checkout via Shopify's Storefront API including product search, cart management, and direct checkout.",
  "staples": "Major office supply retailer offering supplies, ink & toner, furniture, and technology. Guest checkout with business account options for volume discounts and tax exemption.",
  "home-depot": "America's largest home improvement retailer. Guest checkout with real-time inventory for tools, building materials, appliances, paint, and hardware. Pro Xtra accounts for contractors.",
  "lowes": "Leading home improvement retailer offering building materials, tools, appliances, and decor. Guest checkout with store inventory visibility and contractor-focused Pro loyalty program.",
  "office-depot": "Office products retailer offering supplies, furniture, technology, and cleaning products. Guest checkout with business account options for PO numbers and tax exemption.",
  "uline": "Leading distributor of shipping, packaging, and industrial supplies. Extensive catalog of boxes, labels, warehouse equipment, and safety products with same-day shipping.",
  "grainger": "One of the largest MRO (maintenance, repair, operations) distributors. Account required for pricing; offers contract pricing, same-day shipping, and extensive product specs.",
  "newegg": "Leading electronics and computer hardware retailer. Guest checkout available for components, peripherals, networking, and consumer electronics with detailed tech specs.",
  "bh-photo": "Premier photo, video, and electronics retailer. Known for camera gear, pro audio/video equipment, and consumer electronics. Tax-free shopping outside NY.",
  "mcmaster-carr": "Industrial supply catalog with 700,000+ products. Account required; known for fastest delivery in industrial supply. Fasteners, raw materials, tools, and maintenance supplies.",
};

const CATEGORY_TO_SECTOR: Record<string, string> = {
  "retail": "retail",
  "hardware": "home",
  "industrial": "industrial",
  "office": "office",
  "electronics": "electronics",
};

function vendorToRow(vendor: VendorSkill): typeof brandIndex.$inferInsert {
  const skillMd = generateVendorSkill(vendor);
  const sector = vendor.taxonomy?.sector ?? CATEGORY_TO_SECTOR[vendor.category] ?? "retail";
  const domain = new URL(vendor.url).hostname.replace(/^www\./, "");

  return {
    slug: vendor.slug,
    name: vendor.name,
    domain,
    url: vendor.url,
    logoUrl: vendor.logoUrl ?? null,
    description: DESCRIPTIONS[vendor.slug] ?? `Shop ${vendor.name} using CreditClaw payment rails.`,

    sector,
    subSectors: vendor.taxonomy?.subSectors ?? [],
    tier: vendor.taxonomy?.tier ?? null,
    tags: vendor.taxonomy?.tags ?? [],

    carriesBrands: CARRIES_BRANDS[vendor.slug] ?? [],

    hasMcp: vendor.searchDiscovery?.mcp ?? false,
    mcpUrl: null,
    hasApi: vendor.searchDiscovery?.searchApi ?? false,
    apiEndpoint: vendor.searchDiscovery?.apiDocUrl ?? null,
    apiAuthRequired: false,
    apiDocsUrl: vendor.searchDiscovery?.apiDocUrl ?? null,
    hasCli: false,
    cliInstallCommand: null,
    siteSearch: vendor.searchDiscovery?.searchInternal ?? true,
    productFeed: false,

    capabilities: vendor.capabilities,
    checkoutMethods: vendor.checkoutMethods,

    ordering: vendor.buying?.orderingPermission ?? (vendor.checkout.guestCheckout ? "guest" : "registered"),
    checkoutProvider: vendor.buying?.checkoutProviders?.[0] ?? null,
    paymentMethodsAccepted: vendor.buying?.paymentMethods ?? [],
    creditclawSupports: [],
    businessAccount: vendor.capabilities.includes("business_invoicing") || vendor.capabilities.includes("account_creation"),
    taxExemptSupported: vendor.checkout.taxExemptField,
    poNumberSupported: vendor.checkout.poNumberField,

    deliveryOptions: vendor.buying?.deliveryOptions?.split(",").map(s => s.trim()) ?? [],
    freeShippingThreshold: vendor.shipping.freeThreshold?.toString() ?? null,
    shipsInternationally: false,
    supportedCountries: ["US"],

    hasDeals: vendor.deals?.currentDeals ?? false,
    dealsUrl: vendor.deals?.dealsUrl ?? null,
    dealsApi: vendor.deals?.dealsApiEndpoint ?? null,
    loyaltyProgram: vendor.deals?.loyaltyProgram ?? null,

    maturity: vendor.maturity,
    claimedBy: null,
    claimId: null,
    submittedBy: "creditclaw",
    submitterType: "ai_generated",

    version: vendor.version,
    lastVerified: vendor.lastVerified,
    activeVersionId: null,

    brandData: vendor as unknown as Record<string, unknown>,
    skillMd: skillMd,
  };
}

async function seed() {
  const vendors: VendorSkill[] = [
    amazon, shopify, amazon_business, walmart, walmart_business,
    staples, home_depot, lowes, office_depot, uline,
    grainger, newegg, bh_photo, mcmaster_carr,
  ];

  console.log(`Seeding ${vendors.length} brands into brand_index...`);

  for (const vendor of vendors) {
    const row = vendorToRow(vendor);
    let score = 0;
    if (row.hasMcp) score += 25;
    if (row.hasApi) score += 20;
    if (row.ordering === "guest") score += 15;
    if (row.capabilities?.includes("programmatic_checkout")) score += 10;
    if (row.hasDeals) score += 5;
    if (row.productFeed) score += 5;
    if (row.maturity === "verified") score += 5;
    row.agentReadiness = Math.min(score, 100);

    await db.insert(brandIndex)
      .values(row)
      .onConflictDoUpdate({
        target: brandIndex.slug,
        set: { ...row, updatedAt: new Date() },
      });
    console.log(`  ✓ ${vendor.name} (readiness: ${row.agentReadiness}, sector: ${row.sector})`);
  }

  console.log(`\nDone! ${vendors.length} brands seeded.`);
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
