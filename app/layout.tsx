import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

// Link previews (app/opengraph-image.jpg) need absolute URLs. Set NEXT_PUBLIC_SITE_URL before building
// once SNAB has its own domain; until then this is the Hostinger preview address.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://olivedrab-rabbit-869283.hostingersite.com";
const title = "SNAB — Garage sales. Great finds.";
const description = "Browse garage sales, save your favourites and give your good stuff a new home. Add photos, set the details and preview your own sale with SNAB.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: { type: "website", siteName: "SNAB", locale: "en_NZ", title, description },
  twitter: { card: "summary_large_image", title, description },
  applicationName: "SNAB",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/snab-yellow-badge.svg", apple: "/brand/snab-yellow-badge.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f8f5ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-NZ">
      <body>{children}</body>
    </html>
  );
}
