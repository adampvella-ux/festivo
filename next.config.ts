import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["mapbox-gl"],
  // OneDrive can corrupt webpack pack files under .next during dev sync.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" }
    ]
  }
};

export default nextConfig;
