import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "**.replit.dev",
    "127.0.0.1",
    "localhost",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
  turbopack: {},
  async redirects() {
    return [
      { source: "/stripe-wallet", destination: "/usdc-wallet", permanent: true },
      { source: "/api/v1/stripe-wallet/:path*", destination: "/api/v1/usdc-wallet/:path*", permanent: true },
      { source: "/STRIPE-X402-WALLET.md", destination: "/SKILL.md", permanent: false },
      { source: "/USDC-X402-WALLET.md", destination: "/SKILL.md", permanent: false },
      { source: "/solutions/stripe-wallet", destination: "/solutions/usdc-wallet", permanent: true },
      { source: "/sub-agent-cards", destination: "/self-hosted", permanent: true },
      { source: "/sub-agent-cards/:cardId", destination: "/self-hosted/:cardId", permanent: true },
    ];
  },
  env: {},
  output: "standalone",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "assets.vercel.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },
};

export default nextConfig;
