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
  output: "standalone",
  outputFileTracingIncludes: {
    "/static-files/[...path]": ["./static-assets/**/*"],
  },
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
  async rewrites() {
    const STATIC_EXTENSIONS = [
      "md",
      "json",
      "png",
      "jpg",
      "jpeg",
      "svg",
      "gif",
      "webp",
      "ico",
      "ts",
    ];
    return {
      fallback: STATIC_EXTENSIONS.map((ext) => ({
        source: `/:path*.${ext}`,
        destination: `/static-files/:path*.${ext}`,
      })),
    };
  },
};

export default nextConfig;
