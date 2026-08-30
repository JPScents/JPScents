import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { absoluteUrl, siteConfig } from "@/config/site";
import { cormorantGaramond, inter } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteConfig.url,
  title: {
    default: "JPScents | Perfume, chosen with care.",
    template: "%s | JPScents",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: absoluteUrl() },
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: siteConfig.name,
    title: "JPScents | Perfume, chosen with care.",
    description: siteConfig.description,
    url: absoluteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "JPScents | Perfume, chosen with care.",
    description: siteConfig.description,
  },
};

export function generateViewport(): Viewport {
  return { themeColor: "#f7f3ea" };
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorantGaramond.variable} h-full antialiased`}
    >
      <body className={`${inter.className} min-h-full`}>{children}</body>
    </html>
  );
}
