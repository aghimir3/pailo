import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  deploymentId: process.env.DEPLOYMENT_ID || `build-${Date.now()}`,
  transpilePackages: ["@pailo/api-client"],
  async rewrites() {
    // In local dev, proxy /api/* to the backend server.
    // In production, the ALB routes /api/* directly to the backend container.
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
    ];
  },
  env: {
    NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "",
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
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
