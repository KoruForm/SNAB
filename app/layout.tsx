import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { umamiScript, umamiWebsiteId } from "../lib/analytics";
import { comingSoonHome } from "../lib/launch";
import { siteUrl } from "../lib/site";

// While the coming soon teaser is on, shares and search results give nothing away either.
const teaser = comingSoonHome;
const title = teaser ? "SNAB" : "SNAB — Garage sales. Great finds.";
const description = teaser ? "Coming soon to a driveway near you." : "Browse garage sales, save your favourites and give your good stuff a new home. Add photos, set the details and preview your own sale with SNAB.";
const image = teaser
  ? { url: "/social/teaser-preview.jpg", width: 1200, height: 630, alt: "SNAB. Coming soon to a driveway near you." }
  : { url: "/social/link-preview.jpg", width: 1200, height: 630, alt: "SNAB: Good stuff finds new people. Garage Sales Made Easy." };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: { type: "website", siteName: "SNAB", locale: "en_NZ", title, description, images: [image] },
  twitter: { card: "summary_large_image", title, description, images: [image] },
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
      <body>
        {children}
        {umamiWebsiteId && <Script src={umamiScript} data-website-id={umamiWebsiteId} strategy="afterInteractive" />}
      </body>
    </html>
  );
}
