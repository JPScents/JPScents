import type { Metadata } from "next";
import type { ReactNode } from "react";

import { cormorantGaramond, inter } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JPScents",
    template: "%s | JPScents",
  },
  description: "Perfume, chosen with care.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorantGaramond.variable} h-full antialiased`}
    >
      <body className={`${inter.className} min-h-full`}>{children}</body>
    </html>
  );
}
