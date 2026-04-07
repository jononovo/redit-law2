import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { TenantProvider } from "@/lib/platform-management/tenants/tenant-context";
import { cookies } from "next/headers";
import { getTenantConfig } from "@/lib/platform-management/tenants/config";
import { TENANT_THEMES } from "@/lib/platform-management/tenants/tenant-configs";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const THEME_INIT_SCRIPT = `(function(){var m=document.cookie.match(/tenant-id=([^;]+)/);var t=m?m[1]:"creditclaw";var T=${JSON.stringify(TENANT_THEMES)};var th=T[t]||T.creditclaw;var s=document.documentElement.style;s.setProperty("--primary",th.primary);s.setProperty("--primary-foreground",th.primaryForeground);s.setProperty("--accent",th.accent);s.setProperty("--secondary",th.secondary)})()`;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant-id")?.value || "creditclaw";
  const tenant = getTenantConfig(tenantId);

  const faviconIcons = tenant.branding.favicon
    ? [{ url: tenant.branding.favicon, sizes: "32x32" }]
    : [{ url: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${tenant.branding.logoEmoji}</text></svg>` }];

  return {
    metadataBase: new URL(tenant.meta.url || process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com"),
    title: tenant.meta.title,
    description: tenant.meta.description,
    openGraph: {
      title: tenant.meta.title,
      description: tenant.meta.description,
      type: "website",
      siteName: tenant.branding.name,
      images: [{ url: tenant.meta.ogImage, width: 1200, height: 675, alt: `${tenant.branding.name} - ${tenant.branding.tagline}` }],
    },
    twitter: {
      card: "summary_large_image",
      site: tenantId === "creditclaw" ? "@creditclaw" : undefined,
      title: tenant.meta.title,
      description: tenant.meta.description,
      images: [{ url: tenant.meta.twitterImage, width: 1200, height: 675, alt: `${tenant.branding.name} - ${tenant.branding.tagline}` }],
    },
    icons: tenantId === "creditclaw"
      ? {
          icon: [
            { url: "/favicon.ico", sizes: "32x32" },
            { url: "/assets/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
            { url: "/assets/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
          ],
          apple: [{ url: "/assets/images/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
        }
      : { icon: faviconIcons },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant-id")?.value || "creditclaw";
  const tenant = getTenantConfig(tenantId);

  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <TenantProvider tenant={tenant}>
          <Providers>
            {children}
          </Providers>
          {tenant.tracking?.gaId && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${tenant.tracking.gaId}`}
                strategy="lazyOnload"
              />
              <Script id="google-analytics" strategy="lazyOnload">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${tenant.tracking.gaId}');
                `}
              </Script>
            </>
          )}
        </TenantProvider>
      </body>
    </html>
  );
}
