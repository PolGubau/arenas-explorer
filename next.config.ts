import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.arxiusenlinia.cultura.gencat.cat",
      },
    ],
  },
};

export default nextConfig;
