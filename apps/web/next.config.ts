import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@kanikara/contracts"],
  async redirects() {
    return [
      {
        source: "/p/:slug",
        destination: "/products/:slug",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
