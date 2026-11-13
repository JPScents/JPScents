import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { MotionReveal } from "@/ui/MotionReveal";
import { absoluteUrl, siteConfig } from "@/config/site";
import { getRelatedPerfumes } from "@/modules/catalogue/server";
import { getPerfumeDetail } from "./_server/perfume-detail";

import { DesktopProfile } from "./_components/DesktopProfile";
import { PerfumeDetails } from "./_components/PerfumeDetails";
import { PerfumeStructuredData } from "./_components/PerfumeStructuredData";
import { RelatedPerfumes } from "./_components/RelatedPerfumes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const perfume = await getPerfumeDetail(slug);
  if (!perfume) {
    notFound();
  }

  const url = absoluteUrl(siteConfig.routes.perfume(perfume.slug));
  const description = perfume.description || perfume.scentCue;

  return {
    title: perfume.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_NG",
      siteName: siteConfig.name,
      title: perfume.name,
      description,
      url,
    },
    twitter: { card: "summary_large_image", title: perfume.name, description },
  };
}

export default async function PerfumeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const perfume = await getPerfumeDetail(slug);
  if (!perfume) {
    notFound();
  }

  const related = await getRelatedPerfumes(perfume, 3);

  return (
    <>
      <PerfumeStructuredData perfume={perfume} />
      <PerfumeDetails perfume={perfume} />
      <MotionReveal>
        <DesktopProfile perfume={perfume} />
      </MotionReveal>
      <RelatedPerfumes perfumes={related} />
    </>
  );
}
