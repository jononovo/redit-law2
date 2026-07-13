import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin123/",
          "/onboarding/",
          "/setup/",
          "/claim/",
          "/overview",
          "/card-wallet",
          "/usdc-wallet",
          "/self-hosted-cards",
          "/transactions",
          "/settings",
          "/sales",
          "/invoices",
          "/shop",
          "/checkout",
          "/pay",
          "/payment",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
