import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["cdn.sanity.io"], // Tambahkan domain Sanity
  },
};

export default nextConfig;
