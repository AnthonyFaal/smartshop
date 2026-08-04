import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.smartshop.gh",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/smartshop-uploads/**",
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;