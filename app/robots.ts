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
          "/stripe-wallet",
          "/cards",
          "/self-hosted",
          "/sub-agent-cards",
          "/transactions",
          "/settings",
          "/sales",
          "/invoices",
          "/orders",
          "/shop",
          "/checkout",
          "/skill-builder",
          "/pay",
          "/payment",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
