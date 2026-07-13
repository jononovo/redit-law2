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
      { source: "/stripe-wallet", destination: "/stablecoin-wallet", permanent: true },
      { source: "/solutions/stripe-wallet", destination: "/solutions/stablecoin-wallet", permanent: true },
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
