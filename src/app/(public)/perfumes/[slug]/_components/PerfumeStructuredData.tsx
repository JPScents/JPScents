import { JsonLd } from "@/components/shared/JsonLd";
import { absoluteUrl, siteConfig } from "@/config/site";
import type { PublicPerfumeDetail } from "@/features/catalogue";

export function PerfumeStructuredData({ perfume }: { perfume: PublicPerfumeDetail }) {
  const url = absoluteUrl(siteConfig.routes.perfume(perfume.slug));
  const offers = perfume.variants.map((variant) => ({
    "@type": "Offer",
    name: `${perfume.name} ${variant.sizeLabel}`,
    price: (variant.priceMinor / 100).toFixed(2),
    priceCurrency: "NGN",
    availability: `https://schema.org/${variant.isAvailable ? "InStock" : "OutOfStock"}`,
    url,
  }));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: perfume.name,
          description: perfume.description || perfume.scentCue,
          image: absoluteUrl(`${siteConfig.routes.perfume(perfume.slug)}/opengraph-image`),
          url,
          ...(offers.length ? { offers } : {}),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl() },
            {
              "@type": "ListItem",
              position: 2,
              name: "Perfumes",
              item: absoluteUrl(siteConfig.routes.perfumes),
            },
            {
              "@type": "ListItem",
              position: 3,
              name: perfume.name,
              item: url,
            },
          ],
        }}
      />
    </>
  );
}
