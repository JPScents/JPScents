import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { siteConfig } from "@/config/site";
import { getPerfumeBySlug } from "@/features/catalogue";
import { getBrandLogoDataUrl } from "@/lib/metadata/brand-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "JPScents perfume";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const perfume = await getPerfumeBySlug(slug);
  if (!perfume) notFound();

  const [logo, productImage] = await Promise.all([
    getBrandLogoDataUrl(),
    perfume.primaryImageUrl
      ? fetch(perfume.primaryImageUrl)
          .then(async (response) => {
            if (!response.ok) return undefined;
            const image = await response.arrayBuffer();
            const contentType = response.headers.get("content-type")?.split(";")[0];
            const imageType = contentType?.startsWith("image/") ? contentType : "image/jpeg";
            return `data:${imageType};base64,${Buffer.from(image).toString("base64")}`;
          })
          .catch(() => undefined)
      : undefined,
  ]);

  return new ImageResponse(
    <div
      style={{
        background: "#f7f3ea",
        color: "#1f201d",
        display: "flex",
        height: "100%",
        overflow: "hidden",
        padding: "54px 64px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#e7e0d4",
          bottom: 0,
          display: "flex",
          height: "100%",
          position: "absolute",
          right: 0,
          width: "510px",
        }}
      />
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          maxWidth: "630px",
          zIndex: 1,
        }}
      >
        <img alt="" height={85} src={logo} style={{ objectFit: "contain", width: "63px" }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: "#67705c",
              fontSize: 19,
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
            {perfume.isAvailable ? "Available perfume" : "Perfume"}
          </span>
          <span
            style={{
              fontFamily: "serif",
              fontSize: 72,
              letterSpacing: "-2px",
              lineHeight: 1,
              marginTop: "20px",
            }}
          >
            {perfume.name}
          </span>
          <span style={{ color: "#5f625a", fontSize: 26, lineHeight: 1.3, marginTop: "20px" }}>
            {perfume.scentCue}
          </span>
          <span style={{ fontSize: 24, marginTop: "18px" }}>{perfume.startingPrice}</span>
        </div>
        <span style={{ color: "#5f625a", fontSize: 19 }}>{siteConfig.name}</span>
      </div>
      {productImage ? (
        <img
          alt=""
          height={550}
          src={productImage}
          style={{
            bottom: "20px",
            objectFit: "contain",
            position: "absolute",
            right: "28px",
            width: "450px",
            zIndex: 1,
          }}
          width={450}
        />
      ) : null}
    </div>,
    size,
  );
}
