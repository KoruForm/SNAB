import type { Metadata } from "next";
import { ComingSoon } from "../../components/coming-soon";

export const metadata: Metadata = {
  title: "SNAB — Coming soon",
  description: "Garage sales. Great finds. SNAB is coming soon. Sign up to hear when it opens.",
};

export default function ComingSoonPage() {
  return <ComingSoon />;
}
