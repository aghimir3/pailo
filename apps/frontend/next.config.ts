import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  deploymentId: process.env.DEPLOYMENT_ID || `build-${Date.now()}`,
  transpilePackages: ["@pailo/api-client"],
  env: {
    NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "",
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
    NEXT_PUBLIC_COGNITO_REDIRECT_URI: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || "http://localhost:3000/auth/callback",
    NEXT_PUBLIC_COGNITO_LOGOUT_URI: process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI || "http://localhost:3000/auth/logout",
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
