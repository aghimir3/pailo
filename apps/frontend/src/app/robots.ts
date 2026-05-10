import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/catalog"],
        disallow: [
          "/dashboard",
          "/auth",
          "/inventory",
          "/labels",
          "/operations",
          "/people",
          "/production",
          "/productivity",
          "/purchasing",
          "/quality",
          "/reports",
          "/sales",
          "/settings",
          "/suppliers",
          "/tasks",
          "/work-orders",
          "/api/",
        ],
      },
    ],
    sitemap: "https://pailoshoes.com/sitemap.xml",
  };
}
