import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  transpilePackages: ["@pailo/api-client"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/api/v1/catalog/images/**",
      },
      {
        protocol: "https",
        hostname: "app.pailoshoes.com",
        pathname: "/api/v1/catalog/images/**",
      },
    ],
  },
};

export default nextConfig;
