import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";
import { getBrandLogoDataUrl } from "@/lib/metadata/brand-image";

export const alt = "JPScents — Perfume, chosen with care.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await getBrandLogoDataUrl();

  return new ImageResponse(
    <div
      style={{
        background: "#f7f3ea",
        color: "#1f201d",
        display: "flex",
        height: "100%",
        padding: "58px 68px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#e8ede3",
          bottom: 0,
          display: "flex",
          height: "210px",
          position: "absolute",
          right: 0,
          width: "415px",
        }}
      />
      <div
        style={{
          background: "#b0473c",
          height: "8px",
          position: "absolute",
          right: "68px",
          top: "58px",
          width: "110px",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <img alt="" height={116} src={logo} style={{ objectFit: "contain", width: "86px" }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: "#67705c",
              fontSize: 21,
              letterSpacing: "4px",
              textTransform: "uppercase",
            }}
          >
            A considered perfume edit
          </span>
          <span
            style={{
              fontFamily: "serif",
              fontSize: 72,
              letterSpacing: "-2px",
              lineHeight: 1.02,
              marginTop: "22px",
            }}
          >
            Perfume, chosen
            <br />
            with care.
          </span>
        </div>
        <span style={{ color: "#5f625a", fontSize: 21 }}>{siteConfig.url.host}</span>
      </div>
    </div>,
    size,
  );
}
