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
  env: {},
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
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-if-error=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
