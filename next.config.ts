import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  allowedDevOrigins: [
    'f791-154-161-79-59.ngrok-free.app',
    '5606-154-161-79-59.ngrok-free.app',
  ],

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
        pathname: "/smartshop-products/**",
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