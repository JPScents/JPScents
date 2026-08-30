import { ImageResponse } from "next/og";

import { getBrandLogoDataUrl } from "@/lib/metadata/brand-image";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await getBrandLogoDataUrl();

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#f7f3ea",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <img alt="" height={382} src={logo} style={{ objectFit: "contain", width: "284px" }} />
    </div>,
    size,
  );
}
