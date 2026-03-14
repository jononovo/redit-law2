import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com"),
  title: "CreditClaw - Give your bot a card",
  description: "The fun, safe way to give your OpenClaw bot an allowance. Self-hosted cards, wallets, and spending guardrails for AI agents.",
  openGraph: {
    title: "CreditClaw - Give your bot a card",
    description: "The fun, safe way to give your OpenClaw bot an allowance. Self-hosted cards, wallets, and spending guardrails for AI agents.",
    type: "website",
    siteName: "CreditClaw",
    images: [
      {
        url: "/assets/og/og-image.png",
        width: 1200,
        height: 675,
        alt: "CreditClaw - Allowance platform for AI agents",
      },
      {
        url: "/assets/og/og-square.png",
        width: 1200,
        height: 1200,
        alt: "CreditClaw - Allowance platform for AI agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@creditclaw",
    title: "CreditClaw - Give your bot a card",
    description: "The fun, safe way to give your OpenClaw bot an allowance. Self-hosted cards, wallets, and spending guardrails for AI agents.",
    images: [
      {
        url: "/assets/og/og-twitter.png",
        width: 1200,
        height: 675,
        alt: "CreditClaw - Allowance platform for AI agents",
      },
    ],
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
    <html lang="en" className={`${jakarta.variable} ${mono.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-EGT42NKHLB"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-EGT42NKHLB');
          `}
        </Script>
      </body>
    </html>
  );
}
