import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SNAB — Garage Sales Made Easy",
  description: "Garage Sales Made Easy. Try SNAB’s private photo preview while we build a simpler way to find the good stuff nearby.",
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
