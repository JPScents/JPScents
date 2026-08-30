import type { MetadataRoute } from "next";

import { absoluteUrl, siteConfig } from "@/config/site";
import { listPublishedPerfumeSitemapEntries } from "@/features/catalogue";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listPublishedPerfumeSitemapEntries();

  return [
    { url: absoluteUrl(siteConfig.routes.home), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl(siteConfig.routes.perfumes), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl(siteConfig.routes.helpMeChoose), changeFrequency: "monthly", priority: 0.7 },
    ...products.map((product) => ({
      url: absoluteUrl(siteConfig.routes.perfume(product.slug)),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
