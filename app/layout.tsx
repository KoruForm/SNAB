import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SNAB — Garage sales. Great finds.",
  description: "Browse garage sales, save your favourites and give your good stuff a new home. Add photos, set the details and preview your own sale with SNAB.",
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
