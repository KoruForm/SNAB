import type { Metadata } from "next";
import { ComingSoon } from "../../components/coming-soon";

export const metadata: Metadata = {
  title: "SNAB",
  description: "Coming soon to a driveway near you.",
};

export default function ComingSoonPage() {
  return <ComingSoon />;
}
