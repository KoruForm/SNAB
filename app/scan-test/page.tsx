import type { Metadata } from "next";
import { ScanTest } from "../../components/scan-test";
import "./scan-test.css";

// Private field test of AI photo scanning, reached only through the preview link (see proxy.ts and the API route).
export const metadata: Metadata = { title: "SNAB scan test", robots: { index: false, follow: false } };

export default function ScanTestPage() {
  return <ScanTest />;
}
