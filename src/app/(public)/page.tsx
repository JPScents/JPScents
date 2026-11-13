import type { Metadata } from "next";
import { JsonLd } from "@/ui/JsonLd";
import { siteConfig } from "@/config/site";
import { isCommerceCheckoutActive } from "@/infrastructure/paystack/client";
import { getFeaturedPerfumes } from "@/modules/catalogue/server";
import { ClosingCta } from "./_components/ClosingCta";
import { Faqs } from "./_components/Faqs";
import { FeaturedPerfumes } from "./_components/FeaturedPerfumes";
import { GuidancePreview } from "./_components/GuidancePreview";
import { Hero } from "./_components/Hero";
import { OrderingSteps } from "./_components/OrderingSteps";
import { ScentStartingPoints } from "./_components/ScentStartingPoints";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "JPScents | Perfume, chosen with care." },
  description: "Browse available perfumes and find a fragrance that feels right for you.",
  alternates: { canonical: siteConfig.routes.home },
};

export default async function HomePage() {
  const { hero, products } = await getFeaturedPerfumes();
  const onlineCheckout = isCommerceCheckoutActive();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: siteConfig.name,
              url: siteConfig.url.toString(),
              description: siteConfig.description,
            },
            {
              "@type": ["OnlineStore", "Organization"],
              name: siteConfig.name,
              url: siteConfig.url.toString(),
              description: siteConfig.description,
              logo: `${siteConfig.url.toString()}brand/jp-scents-logo.png`,
            },
          ],
        }}
      />
      <Hero hero={hero} />
      <FeaturedPerfumes products={products} />
      {hero ? (
        <>
          <ScentStartingPoints />
          <GuidancePreview />
        </>
      ) : null}
      <OrderingSteps onlineCheckout={onlineCheckout} />
      <Faqs onlineCheckout={onlineCheckout} />
      {hero ? <ClosingCta /> : null}
    </>
  );
}
