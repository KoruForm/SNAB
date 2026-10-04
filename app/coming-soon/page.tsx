import type { Metadata } from "next";
import { ComingSoon } from "../../components/coming-soon";

export const metadata: Metadata = {
  title: "SNAB — Coming soon to Hamilton",
  description: "Garage sales. Great finds. SNAB is coming soon to Hamilton. Sign up to hear when it opens.",
};

export default function ComingSoonPage() {
  return <ComingSoon />;
}
