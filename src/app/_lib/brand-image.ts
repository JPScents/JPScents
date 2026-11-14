import { readFile } from "node:fs/promises";
import { join } from "node:path";

let brandLogoDataUrl: Promise<string> | undefined;

export function getBrandLogoDataUrl() {
  brandLogoDataUrl ??= readFile(
    join(process.cwd(), "public/brand/jp-scents-logo.png"),
    "base64",
  ).then((logo) => `data:image/png;base64,${logo}`);
  return brandLogoDataUrl;
}
