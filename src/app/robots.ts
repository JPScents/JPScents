import type { MetadataRoute } from "next";

import { absoluteUrl, isProductionDeployment } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeployment()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/auth", "/cart", "/checkout"],
    },
    host: absoluteUrl(),
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
