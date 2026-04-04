import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { TenantHydrator } from "@/lib/tenants/tenant-hydrator";
import { TenantAnalytics } from "@/lib/tenants/tenant-analytics";
import { TENANT_THEMES } from "@/lib/tenants/tenant-configs";

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com"),
  title: "CreditClaw - Give your bot a card",
  description: "The fun, safe way to give your OpenClaw bot an allowance. Self-hosted cards, wallets, and spending guardrails for AI agents.",
  openGraph: {
    title: "CreditClaw - Give your bot a card",
    description: "The fun, safe way to give your OpenClaw bot an allowance. Self-hosted cards, wallets, and spending guardrails for AI agents.",
    type: "website",
    siteName: "CreditClaw",
  },
  twitter: {
    card: "summary_large_image",
    site: "@creditclaw",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/assets/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/assets/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/assets/images/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <TenantHydrator>
          <Providers>
            {children}
          </Providers>
          <TenantAnalytics />
        </TenantHydrator>
      </body>
    </html>
  );
}
