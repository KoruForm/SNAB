import type { Metadata } from "next";
import { Insider } from "../../components/insider";

// Only reached from letterbox flyer QR codes, so it stays out of search results and the mystery holds for everyone else.
export const metadata: Metadata = {
  title: "You're in on it · SNAB",
  description: "Your street gets the secret first.",
  robots: { index: false, follow: false },
};

export default function InsiderPage() {
  return <Insider />;
}
