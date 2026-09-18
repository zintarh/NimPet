import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "app.focusling.app" }],
        destination: "/app",
        permanent: false,
      },
    ];
  },
  // Allow ngrok and any tunnel host for local Nimiq Pay testing
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.loca.lt"],
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "lucide-react",
      "wagmi",
      "viem",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
