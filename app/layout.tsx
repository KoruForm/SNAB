import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

// Link previews (app/opengraph-image.jpg) need absolute URLs. Set NEXT_PUBLIC_SITE_URL before building
// once SNAB has its own domain; until then this is the Hostinger preview address.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://olivedrab-rabbit-869283.hostingersite.com";
const description = "Garage Sales Made Easy. Find garage sales near you in Hamilton, or list your own in minutes.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SNAB — Garage Sales Made Easy",
  description,
  openGraph: { type: "website", siteName: "SNAB", locale: "en_NZ", title: "SNAB — Garage Sales Made Easy", description },
  twitter: { card: "summary_large_image", title: "SNAB — Garage Sales Made Easy", description },
  applicationName: "SNAB",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/snab-yellow-badge.svg", apple: "/brand/snab-yellow-badge.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f7f3e8",
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
