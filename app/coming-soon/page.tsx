import type { Metadata } from "next";
import { ComingSoon } from "../../components/coming-soon";

export const metadata: Metadata = {
  title: "SNAB",
  description: "Something’s coming to your street.",
};

export default function ComingSoonPage() {
  return <ComingSoon />;
}
