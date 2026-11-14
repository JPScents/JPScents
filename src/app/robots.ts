import type { MetadataRoute } from "next";

import { deploymentContext } from "@/config/deployment";
import { absoluteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  if (deploymentContext() !== "production") {
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
